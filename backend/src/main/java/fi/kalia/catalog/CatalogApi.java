package fi.kalia.catalog;

import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.domain.Beer;
import java.util.Collection;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;

@Component
@RequiredArgsConstructor
public class CatalogApi {

	// Matches the /beers/batch HTTP cap (CatalogController): an id set this
	// module API resolves must be bounded the same way (ADR-0042).
	private static final int MAX_BATCH_IDS = 100;

	private final CatalogService catalog;

	public boolean beerExists(UUID beerId) {
		return catalog.beerExists(beerId);
	}

	/** An id matching no beer is absent from the map, never a null value. */
	public Map<UUID, BeerSummary> getBeerSummaries(Collection<UUID> beerIds) {
		Assert.isTrue(beerIds.size() <= MAX_BATCH_IDS, "beerIds must not exceed " + MAX_BATCH_IDS);
		return catalog.getBeers(beerIds).stream()
				.collect(Collectors.toMap(Beer::getId,
						beer -> new BeerSummary(beer.getId(), beer.getName(), beer.getBrewery().getName())));
	}

}
