package fi.kalia.catalog.application;

import java.util.UUID;

public class SuggestionNotFoundException extends RuntimeException {

	SuggestionNotFoundException(UUID id) {
		super("No suggestion is waiting for review under %s".formatted(id));
	}

}
