package fi.kalia.cellar.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.BeerSummaries;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.cellar.domain.Bottle;
import fi.kalia.cellar.domain.BottleCount;
import fi.kalia.cellar.domain.BottleListing;
import fi.kalia.cellar.domain.BottleTotals;
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
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
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

	/** A public read shows at most this many bottles of one beer; the entry still reports how many are held. */
	public static final int MAX_PUBLIC_BOTTLES_PER_ENTRY = 25;

	@Transactional(readOnly = true)
	public List<EntryView> listEntries(UUID userId) {
		return joined(entries.findWithBottlesByUserId(userId), userId);
	}

	// One exception for every refusal, so none can be told from another (ADR-0050).
	@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
	public PublicCellarPage readPublicCellar(String username, Pageable pageable) {
		UUID ownerId = profile.publicCellarOwnerId(username).orElseThrow(PublicCellarNotFoundException::new);
		Set<UUID> withheld = catalog.withheldFromPublic(entries.findBeerIdsByUserId(ownerId));
		Page<Entry> page = entries.findPageByUserIdExcludingBeers(ownerId, withheld, pageable);
		List<UUID> entryIds = page.getContent().stream().map(Entry::getId).toList();
		Map<UUID, Long> held = entries.countBottlesByEntryId(entryIds).stream()
				.collect(Collectors.toMap(BottleCount::entryId, BottleCount::count));
		Map<UUID, List<BottleListing>> shown = entries
				.listBottles(entries.findIdsOfOldestBottlesOfEntries(entryIds, MAX_PUBLIC_BOTTLES_PER_ENTRY))
				.stream()
				.collect(Collectors.groupingBy(BottleListing::entryId));
		List<Entry> notEmpty = page.getContent().stream().filter(entry -> held.getOrDefault(entry.getId(), 0L) > 0).toList();
		BeerSummaries beers = catalog.getBeerSummaries(notEmpty.stream().map(Entry::getBeerId).toList(), null);
		List<PublicCellarEntry> cellar = notEmpty.stream()
				.flatMap(entry -> {
					BeerSummary beer = beers.found().get(entry.getBeerId());
					if (beer == null) {
						warnUnlessWithheld(entry, beers);
						return Stream.empty();
					}
					return Stream.of(new PublicCellarEntry(entry, beer, held.get(entry.getId()), shown.get(entry.getId())));
				})
				.toList();
		BottleTotals totals = entries.totalBottlesOfExcludingBeers(ownerId, withheld);
		return new PublicCellarPage(cellar, page.getTotalElements(), page.getTotalPages(), page.getNumber(),
				totals.count(), totals.lastAddedAt());
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
		Bottle updated = entry.updateBottle(bottleIn(entry, bottleId), containerType, brewedDate, bestBeforeDate, clock);
		entries.save(entry);
		return updated;
	}

	@Retryable(includes = ObjectOptimisticLockingFailureException.class, maxRetries = 1, delay = 0)
	public void removeBottle(UUID userId, UUID bottleId) {
		Entry entry = ownerOf(userId, bottleId);
		entry.removeBottle(bottleIn(entry, bottleId), clock);
		if (entry.isEmpty()) {
			entries.delete(entry);
		} else {
			entries.save(entry);
		}
	}

	private List<EntryView> joined(List<Entry> found, UUID ownerId) {
		List<Entry> held = found.stream().filter(entry -> !entry.isEmpty()).toList();
		BeerSummaries beers = catalog.getBeerSummaries(held.stream().map(Entry::getBeerId).toList(), ownerId);
		return held.stream()
				.flatMap(entry -> {
					BeerSummary beer = beers.found().get(entry.getBeerId());
					if (beer == null) {
						warnUnlessWithheld(entry, beers);
						return Stream.empty();
					}
					return Stream.of(new EntryView(entry, beer));
				})
				.sorted(defaultOrder())
				.toList();
	}

	// A beer still awaiting approval is left out of a public read on purpose (ADR-0091); any
	// other missing beer breaks the catalog's rule that its rows are never deleted.
	private void warnUnlessWithheld(Entry entry, BeerSummaries beers) {
		if (!beers.withheld().contains(entry.getBeerId())) {
			log.warn("Left cellar entry {} out: its beer {} is not in the catalog", entry.getId(), entry.getBeerId());
		}
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

	private static Bottle bottleIn(Entry entry, UUID bottleId) {
		return entry.findBottle(bottleId).orElseThrow(() -> new BottleNotFoundException(bottleId));
	}

	// Checks the existing entry before the catalog: an entry already proves
	// the beer exists, since nothing deletes catalog beers (ADR-0091).
	private Entry entryFor(UUID userId, UUID beerId) {
		return entries.findByUserIdAndBeerId(userId, beerId)
				.orElseGet(() -> {
					if (!catalog.beerExists(beerId, userId)) {
						throw new BeerNotFoundException(beerId);
					}
					return Entry.create(userId, beerId, clock);
				});
	}

}
