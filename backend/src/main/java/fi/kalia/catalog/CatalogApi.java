package fi.kalia.catalog;

import fi.kalia.catalog.application.CatalogService;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class CatalogApi {

	private final CatalogService catalog;

	public boolean beerExists(UUID beerId) {
		return catalog.beerExists(beerId);
	}

}
