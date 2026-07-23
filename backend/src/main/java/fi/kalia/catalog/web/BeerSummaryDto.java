package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.Beer;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;

@Schema(description = "A beer as it appears in search results")
public record BeerSummaryDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String style,
		@Schema(description = "Alcohol by volume, percent", requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal abv,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) MoneyDto price,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) BreweryRefDto brewery) {

	static BeerSummaryDto from(Beer beer) {
		return new BeerSummaryDto(beer.getId(), beer.getName(), beer.getStyle(), beer.getAbv(),
				MoneyDto.from(beer.getPrice()), BreweryRefDto.from(beer.getBrewery()));
	}

}
