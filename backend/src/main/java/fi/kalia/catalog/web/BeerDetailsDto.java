package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Beer;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "Full details for a single beer")
public record BeerDetailsDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String style,
		@Schema(description = "Alcohol by volume, percent", requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal abv,
		@Nullable String description,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) MoneyDto price,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) BreweryDto brewery) {

	static BeerDetailsDto from(Beer beer) {
		return new BeerDetailsDto(beer.getId(), beer.getName(), beer.getStyle(), beer.getAbv(),
				beer.getDescription(), MoneyDto.from(beer.getPrice()),
				BreweryDto.from(beer.getBrewery()));
	}

}
