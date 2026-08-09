package fi.kalia.cellar.application;

import fi.kalia.catalog.CatalogApi;
import fi.kalia.cellar.domain.Bottle;
import fi.kalia.cellar.domain.BottleRepository;
import fi.kalia.cellar.domain.ContainerType;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
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
		Bottle bottle = Bottle.create(entry, containerType, brewedDate, bestBeforeDate);
		return bottles.save(bottle);
	}

	/** See {@link #addBottle} for why bottles save through {@code bottles}, not {@code entries}. */
	public List<Bottle> addBottles(UUID userId, UUID beerId, int quantity, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Entry entry = entryFor(userId, beerId);
		List<Bottle> created = entry.addBottles(quantity, containerType, brewedDate, bestBeforeDate);
		return bottles.saveAll(created);
	}

	/**
	 * Takes {@code userId} and reports a bottle owned by someone else as not
	 * found rather than checking existence first: the alternative would let a
	 * caller enumerate other users' bottle ids by the different error they get
	 * back for "exists" versus "exists but isn't yours".
	 */
	public void removeBottle(UUID userId, UUID bottleId) {
		Bottle bottle = bottles.findById(bottleId)
				.filter(b -> b.getEntry().getUserId().equals(userId))
				.orElseThrow(() -> new BottleNotFoundException(bottleId));
		bottle.getEntry().removeBottle(bottle);
	}

	private Entry entryFor(UUID userId, UUID beerId) {
		if (!catalog.beerExists(beerId)) {
			throw new BeerNotFoundException(beerId);
		}
		return entries.findByUserIdAndBeerId(userId, beerId)
				.orElseGet(() -> entries.save(Entry.create(userId, beerId)));
	}

}
