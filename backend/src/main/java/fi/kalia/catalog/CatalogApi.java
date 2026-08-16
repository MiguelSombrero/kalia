package fi.kalia.catalog;

import fi.kalia.catalog.domain.BeerRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CatalogApi {

	private final BeerRepository beers;

	public boolean beerExists(UUID beerId) {
		return beers.existsById(beerId);
	}

}
