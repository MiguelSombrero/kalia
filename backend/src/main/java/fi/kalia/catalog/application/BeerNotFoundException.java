package fi.kalia.catalog.application;

import java.util.UUID;

public class BeerNotFoundException extends RuntimeException {

	BeerNotFoundException(UUID id) {
		super("Beer %s does not exist".formatted(id));
	}

}
