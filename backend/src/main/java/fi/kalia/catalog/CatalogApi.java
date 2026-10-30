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
	 * The ids among {@code beerIds} that a signed-out reader may not be shown yet: those still
	 * awaiting approval (ADR-0091). An id matching no beer is not among them.
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
	 * Every beer that exists, hidden ones too, except another contributor's still-pending one, which
	 * is {@link BeerSummaries#withheld}. An id matching no beer is in neither, and no value is null.
	 * {@code viewerId} is null for a public read (ADR-0091).
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
