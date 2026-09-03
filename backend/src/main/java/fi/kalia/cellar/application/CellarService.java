package fi.kalia.cellar.application;

import fi.kalia.catalog.CatalogApi;
import fi.kalia.cellar.domain.Bottle;
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

	private final CatalogApi catalog;

	public List<EntrySummary> listEntries(UUID userId) {
		return entries.findSummariesByUserId(userId);
	}

	public List<Bottle> listBottles(UUID userId, UUID entryId) {
		Entry entry = entries.findByIdAndUserId(entryId, userId)
				.orElseThrow(() -> new EntryNotFoundException(entryId));
		return entry.getBottles();
	}

	public List<Bottle> addBottles(UUID userId, UUID beerId, int quantity, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Entry entry = entryFor(userId, beerId);
		entry.addBottles(quantity, containerType, brewedDate, bestBeforeDate);
		return entries.save(entry).lastBottles(quantity);
	}

	public Bottle updateBottle(UUID userId, UUID bottleId, ContainerType containerType,
			@Nullable LocalDate brewedDate, @Nullable LocalDate bestBeforeDate) {
		Entry entry = ownerOf(userId, bottleId);
		Bottle updated = entry.updateBottle(bottleId, containerType, brewedDate, bestBeforeDate);
		entries.save(entry);
		return updated;
	}

	public void removeBottle(UUID userId, UUID bottleId) {
		Entry entry = ownerOf(userId, bottleId);
		entry.removeBottle(bottleId);
		if (entry.isEmpty()) {
			entries.delete(entry);
		} else {
			entries.save(entry);
		}
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
					return Entry.create(userId, beerId);
				});
	}

}
