package fi.kalia.catalog;

import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

public record BeerDetailsDto(UUID id, String name, String style, BigDecimal abv,
		@Nullable String description, MoneyDto price, BreweryDto brewery) {
}
