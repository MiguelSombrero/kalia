package fi.kalia.catalog;

import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.domain.Beer;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Gatherers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CatalogApi {

	// Matches the /beers/batch HTTP cap (CatalogController): one query's IN
	// clause is bounded the same way (ADR-0042).
	static final int MAX_BATCH_IDS = 100;

	private final CatalogService catalog;

	public boolean beerExists(UUID beerId) {
		return catalog.beerExists(beerId);
	}

	/** An id matching no beer is absent from the map, never a null value. */
	public Map<UUID, BeerSummary> getBeerSummaries(Collection<UUID> beerIds) {
		return beerIds.stream()
				.distinct()
				.gather(Gatherers.windowFixed(MAX_BATCH_IDS))
				.flatMap(chunk -> catalog.getBeers(chunk).stream())
				.collect(Collectors.toMap(Beer::getId,
						beer -> new BeerSummary(beer.getId(), beer.getName(), beer.getBrewery().getName(),
								beer.getStyle(), beer.getAbv())));
	}

}
