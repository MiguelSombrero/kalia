package fi.kalia.catalog.application;

import java.util.UUID;

public class BreweryNotFoundException extends RuntimeException {

	BreweryNotFoundException(UUID id) {
		super("Brewery %s does not exist".formatted(id));
	}

}
