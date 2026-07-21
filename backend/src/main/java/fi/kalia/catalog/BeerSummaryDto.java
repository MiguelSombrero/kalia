package fi.kalia.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;

@Schema(description = "A beer as it appears in search results")
public record BeerSummaryDto(
		UUID id,
		String name,
		String style,
		@Schema(description = "Alcohol by volume, percent") BigDecimal abv,
		MoneyDto price,
		BreweryRefDto brewery) {
}
