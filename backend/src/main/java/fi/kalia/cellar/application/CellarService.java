package fi.kalia.cellar.application;

import fi.kalia.catalog.CatalogApi;
import fi.kalia.cellar.domain.Bottle;
import fi.kalia.cellar.domain.BottleRepository;
import fi.kalia.cellar.domain.ContainerType;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
import fi.kalia.cellar.domain.EntrySummary;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CellarService {

	private final EntryRepository entries;

	private final BottleRepository bottles;

	private final CatalogApi catalog;

	public List<EntrySummary> listEntries(UUID userId) {
		return entries.findSummariesByUserId(userId);
	}

	/**
	 * Takes {@code userId} for the same reason {@link #removeBottle} does: an
	 * entry belonging to someone else must read as not found, never as
	 * forbidden.
	 */
	public List<Bottle> listBottles(UUID userId, UUID entryId) {
		Entry entry = entries.findByIdAndUserId(entryId, userId)
				.orElseThrow(() -> new EntryNotFoundException(entryId));
		return bottles.findByEntryIdOrderByCreatedAt(entry.getId());
	}

	/**
	 * Do not persist a newly created bottle by calling {@code
	 * entries.save(entry)} instead: once {@code entry} is already managed,
	 * Spring Data routes {@code save} through {@code EntityManager.merge},
	 * which cascades to a transient child by copying it into a new managed
	 * instance — the bottle reference returned to the caller would keep a
	 * null id even though a row was inserted.
	 */
	public Bottle addBottle(UUID userId, UUID beerId, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Entry entry = entryFor(userId, beerId);
		Bottle bottle = createBottle(entry, containerType, brewedDate, bestBeforeDate);
		return bottles.save(bottle);
	}

	/** See {@link #removeBottle} for why ownership is checked through {@code userId}, not after loading by id alone. */
	public Bottle updateBottle(UUID userId, UUID bottleId, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Bottle bottle = findOwnedBottle(userId, bottleId);
		try {
			bottle.update(containerType, brewedDate, bestBeforeDate);
		} catch (IllegalArgumentException e) {
			throw new InvalidBottleException(e.getMessage(), e);
		}
		return bottle;
	}

	/**
	 * Isolates the {@code catch} to the one call that can throw for a bottle
	 * validation reason — {@link #addBottle} must not also catch whatever
	 * {@code bottles.save(...)} itself could throw, or an unrelated
	 * persistence-layer {@code IllegalArgumentException} would be misreported
	 * as an invalid bottle (backend/README.md error-handling convention).
	 */
	private static Bottle createBottle(Entry entry, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		try {
			return Bottle.create(entry, containerType, brewedDate, bestBeforeDate);
		} catch (IllegalArgumentException e) {
			throw new InvalidBottleException(e.getMessage(), e);
		}
	}

	/** See {@link #addBottle} for why bottles save through {@code bottles}, not {@code entries}. */
	public List<Bottle> addBottles(UUID userId, UUID beerId, int quantity, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Entry entry = entryFor(userId, beerId);
		List<Bottle> created = entry.addBottles(quantity, containerType, brewedDate, bestBeforeDate);
		return bottles.saveAll(created);
	}

	/**
	 * Deletes {@code bottle} explicitly rather than relying solely on
	 * {@code Entry.removeBottle}'s orphan-removal cascade: on the common case
	 * of a fresh request, {@code entry.getBottles()} is not yet loaded, and
	 * Hibernate only cascades an orphan delete for a collection it already
	 * initialized. Calling both is safe — Hibernate treats a second delete of
	 * an entity already marked removed as a no-op, so this never issues two
	 * {@code DELETE} statements.
	 */
	public void removeBottle(UUID userId, UUID bottleId) {
		Bottle bottle = findOwnedBottle(userId, bottleId);
		bottle.getEntry().removeBottle(bottle);
		bottles.delete(bottle);
	}

	/**
	 * Takes {@code userId} and reports a bottle owned by someone else as not
	 * found rather than checking existence first: the alternative would let a
	 * caller enumerate other users' bottle ids by the different error they get
	 * back for "exists" versus "exists but isn't yours". Shared by
	 * {@link #updateBottle} and {@link #removeBottle} so the isolation check
	 * lives in exactly one place.
	 */
	private Bottle findOwnedBottle(UUID userId, UUID bottleId) {
		return bottles.findById(bottleId)
				.filter(b -> b.getEntry().getUserId().equals(userId))
				.orElseThrow(() -> new BottleNotFoundException(bottleId));
	}

	/**
	 * Checks the caller's existing entry before the catalog: an entry already
	 * proves the beer exists, since nothing deletes catalog beers before
	 * iteration 8, saving a query on the common case of adding another bottle
	 * of a beer the caller already owns.
	 */
	private Entry entryFor(UUID userId, UUID beerId) {
		return entries.findByUserIdAndBeerId(userId, beerId)
				.orElseGet(() -> {
					if (!catalog.beerExists(beerId)) {
						throw new BeerNotFoundException(beerId);
					}
					return entries.save(Entry.create(userId, beerId));
				});
	}

}
