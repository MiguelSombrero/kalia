package fi.kalia.catalog.application;

import java.util.UUID;
import org.jspecify.annotations.Nullable;

public sealed interface BreweryChoice {

	record Existing(UUID breweryId) implements BreweryChoice {
	}

	record New(String name, String countryCode, @Nullable String city) implements BreweryChoice {
	}

}
