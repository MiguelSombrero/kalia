package fi.kalia.catalog;

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
}
