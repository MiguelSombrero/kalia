package fi.kalia.cellar.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.cellar.domain.Bottle;
import fi.kalia.cellar.domain.ContainerType;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
import fi.kalia.profile.ProfileApi;
import java.text.Collator;
import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class CellarService {

	private final EntryRepository entries;

	private final CatalogApi catalog;

	private final ProfileApi profile;

	private final Clock clock;

	@Transactional(readOnly = true)
	public List<EntryView> listEntries(UUID userId) {
		return joined(entries.findWithBottlesByUserId(userId));
	}

	// One exception for every refusal, so none can be told from another (ADR-0050).
	@Transactional(readOnly = true)
	public List<EntryView> readPublicCellar(String username) {
		UUID ownerId = profile.publicCellarOwnerId(username).orElseThrow(PublicCellarNotFoundException::new);
		return joined(entries.findWithBottlesByUserId(ownerId));
	}

	// ADR-0057; each retry's own transaction is verified by ConcurrentAddBottleApiIT.
	@Retryable(includes = {DataIntegrityViolationException.class, ObjectOptimisticLockingFailureException.class},
			maxRetries = 1, delay = 0)
	// Do not add a side effect before entries.save(entry): a retry re-runs this whole method.
	public List<Bottle> addBottles(UUID userId, UUID beerId, int quantity, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Entry entry = entryFor(userId, beerId);
		entry.addBottles(quantity, containerType, brewedDate, bestBeforeDate, clock);
		return entries.save(entry).lastBottles(quantity);
	}

	@Retryable(includes = ObjectOptimisticLockingFailureException.class, maxRetries = 1, delay = 0)
	public Bottle updateBottle(UUID userId, UUID bottleId, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Entry entry = ownerOf(userId, bottleId);
		Bottle updated = entry.updateBottle(bottleId, containerType, brewedDate, bestBeforeDate, clock);
		entries.save(entry);
		return updated;
	}

	@Retryable(includes = ObjectOptimisticLockingFailureException.class, maxRetries = 1, delay = 0)
	public void removeBottle(UUID userId, UUID bottleId) {
		Entry entry = ownerOf(userId, bottleId);
		entry.removeBottle(bottleId, clock);
		if (entry.isEmpty()) {
			entries.delete(entry);
		} else {
			entries.save(entry);
		}
	}

	private List<EntryView> joined(List<Entry> found) {
		List<Entry> held = found.stream().filter(entry -> !entry.isEmpty()).toList();
		Map<UUID, BeerSummary> beers = catalog.getBeerSummaries(held.stream().map(Entry::getBeerId).toList());
		return held.stream()
				.flatMap(entry -> {
					BeerSummary beer = beers.get(entry.getBeerId());
					if (beer == null) {
						log.warn("Left cellar entry {} out: its beer {} is not in the catalog", entry.getId(),
								entry.getBeerId());
						return Stream.empty();
					}
					return Stream.of(new EntryView(entry, beer));
				})
				.sorted(defaultOrder())
				.toList();
	}

	private static Comparator<EntryView> defaultOrder() {
		Collator byName = Collator.getInstance(Locale.ROOT);
		return Comparator.comparing((EntryView view) -> view.beer().name(), byName)
				.thenComparing(view -> view.entry().getId());
	}

	private Entry ownerOf(UUID userId, UUID bottleId) {
		return entries.findByBottleIdAndUserId(bottleId, userId)
				.orElseThrow(() -> new BottleNotFoundException(bottleId));
	}

	// Checks the existing entry before the catalog: an entry already proves
	// the beer exists, since nothing deletes catalog beers.
	private Entry entryFor(UUID userId, UUID beerId) {
		return entries.findByUserIdAndBeerId(userId, beerId)
				.orElseGet(() -> {
					if (!catalog.beerExists(beerId)) {
						throw new BeerNotFoundException(beerId);
					}
					return Entry.create(userId, beerId, clock);
				});
	}

}
