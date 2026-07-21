package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Brewery;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "Brief reference to a brewery, as embedded in a beer summary")
public record BreweryRefDto(UUID id, String name) {

	static BreweryRefDto from(Brewery brewery) {
		return new BreweryRefDto(brewery.getId(), brewery.getName());
	}

}
