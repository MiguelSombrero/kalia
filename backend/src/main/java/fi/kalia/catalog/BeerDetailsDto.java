package fi.kalia.catalog;

import java.math.BigDecimal;
import java.util.UUID;

public record BeerDetailsDto(UUID id, String name, String style, BigDecimal abv,
		String description, PriceDto price, BreweryDto brewery) {
}
