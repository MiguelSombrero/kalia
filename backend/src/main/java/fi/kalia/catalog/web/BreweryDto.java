package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Brewery;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "A brewery")
public record BreweryDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
		@Schema(description = "ISO 3166-1 alpha-2 code; a client names the country in its reader's language",
				requiredMode = Schema.RequiredMode.REQUIRED) String countryCode,
		@Nullable String city) {

	static BreweryDto from(Brewery brewery) {
		return new BreweryDto(brewery.getId(), brewery.getName(), brewery.getCountryCode(),
				brewery.getCity());
	}

}
