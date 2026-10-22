package fi.kalia.catalog.application;

import java.util.UUID;
import lombok.Getter;

@Getter
public class DuplicateBreweryException extends RuntimeException {

	private final UUID existingBreweryId;

	DuplicateBreweryException(UUID existingBreweryId) {
		super("The catalog already has a brewery of this name in this country");
		this.existingBreweryId = existingBreweryId;
	}

}
