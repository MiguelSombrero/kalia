package fi.kalia.catalog.internal;

import java.util.UUID;

class BeerNotFoundException extends RuntimeException {

	BeerNotFoundException(UUID id) {
		super("Beer %s does not exist".formatted(id));
	}

}
