package fi.kalia.catalog.application;

import java.util.UUID;
import lombok.Getter;

@Getter
public class DuplicateBreweryException extends RuntimeException {

	private final UUID existingBreweryId;

	private final String existingBreweryName;

	private final String existingBreweryCountryCode;

	DuplicateBreweryException(UUID existingBreweryId, String existingBreweryName, String existingBreweryCountryCode) {
		super("The catalog already has a brewery of this name in this country");
		this.existingBreweryId = existingBreweryId;
		this.existingBreweryName = existingBreweryName;
		this.existingBreweryCountryCode = existingBreweryCountryCode;
	}

}
