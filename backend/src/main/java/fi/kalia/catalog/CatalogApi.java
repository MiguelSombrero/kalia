package fi.kalia.catalog;

import fi.kalia.catalog.domain.BeerRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Read-only inter-module API (ADR-0007); {@code cellar} is its first consumer. */
@Component
@RequiredArgsConstructor
public class CatalogApi {

	private final BeerRepository beers;

	public boolean beerExists(UUID beerId) {
		return beers.existsById(beerId);
	}

}
