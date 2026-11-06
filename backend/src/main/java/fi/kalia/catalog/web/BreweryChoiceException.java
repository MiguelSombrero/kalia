package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BreweryChoice;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

class BreweryChoiceException extends RuntimeException {

	BreweryChoiceException() {
		super("give exactly one of breweryId and newBrewery");
	}

	static BreweryChoice choose(@Nullable UUID breweryId, @Nullable NewBreweryRequestDto newBrewery) {
		if (breweryId != null && newBrewery == null) {
			return new BreweryChoice.Existing(breweryId);
		}
		if (breweryId == null && newBrewery != null) {
			return new BreweryChoice.New(newBrewery.name(), newBrewery.countryCode(), newBrewery.city());
		}
		throw new BreweryChoiceException();
	}

}
