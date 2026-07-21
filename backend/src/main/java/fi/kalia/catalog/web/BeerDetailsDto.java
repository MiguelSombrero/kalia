package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Beer;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "Full details for a single beer")
public record BeerDetailsDto(
		UUID id,
		String name,
		String style,
		@Schema(description = "Alcohol by volume, percent") BigDecimal abv,
		@Nullable String description,
		MoneyDto price,
		BreweryDto brewery) {

	static BeerDetailsDto from(Beer beer) {
		return new BeerDetailsDto(beer.getId(), beer.getName(), beer.getStyle(), beer.getAbv(),
				beer.getDescription(), MoneyDto.from(beer.getPrice()),
				BreweryDto.from(beer.getBrewery()));
	}

}
