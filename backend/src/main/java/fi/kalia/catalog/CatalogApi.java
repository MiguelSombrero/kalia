package fi.kalia.catalog;

import fi.kalia.catalog.application.CatalogService;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Gatherers;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CatalogApi {

	// Bounds one query's IN clause (ADR-0042).
	static final int MAX_BATCH_IDS = 100;

	private final CatalogService catalog;

	/** Whether the viewer may cellar this beer: one they can see in search (ADR-0091). */
	public boolean beerExists(UUID beerId, UUID viewerId) {
		return catalog.beerVisibleTo(beerId, viewerId);
	}

	/**
	 * The ids among {@code beerIds} that a signed-out reader may not be shown in a cellar: every
	 * beer not {@code APPROVED}, whether awaiting approval, refused or taken down (ADR-0091). An
	 * id matching no beer is not among them.
	 */
	public Set<UUID> withheldFromPublic(Collection<UUID> beerIds) {
		Set<UUID> withheld = new HashSet<>();
		beerIds.stream()
				.distinct()
				.gather(Gatherers.windowFixed(MAX_BATCH_IDS))
				.forEach(chunk -> withheld.addAll(catalog.withheldFromPublic(chunk)));
		return withheld;
	}

	/**
	 * The beers among {@code beerIds} that {@code viewerId} may be shown, and those it may not
	 * ({@link BeerSummaries#withheld}). A null {@code viewerId} is a public read, which shows
	 * {@code APPROVED} beers alone. A non-null one is a read of that viewer's own holdings: it adds
	 * their own pending beers and the rejected or removed ones, marked {@link BeerSummary#withdrawn}.
	 * An id matching no beer is in neither, and no value is null (ADR-0091).
	 */
	public BeerSummaries getBeerSummaries(Collection<UUID> beerIds, @Nullable UUID viewerId) {
		Map<UUID, BeerSummary> found = new HashMap<>();
		Set<UUID> withheld = new HashSet<>();
		beerIds.stream()
				.distinct()
				.gather(Gatherers.windowFixed(MAX_BATCH_IDS))
				.map(chunk -> catalog.getBeerSummaries(chunk, viewerId))
				.forEach(chunkResult -> {
					found.putAll(chunkResult.found());
					withheld.addAll(chunkResult.withheld());
				});
		return new BeerSummaries(found, withheld);
	}

}
