package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Brewery;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "A brewery")
public record BreweryDto(UUID id, String name, String country, @Nullable String city) {

	static BreweryDto from(Brewery brewery) {
		return new BreweryDto(brewery.getId(), brewery.getName(), brewery.getCountry(),
				brewery.getCity());
	}

}
