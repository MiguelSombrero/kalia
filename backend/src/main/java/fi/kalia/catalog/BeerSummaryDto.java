package fi.kalia.catalog;

import java.math.BigDecimal;
import java.util.UUID;

public record BeerSummaryDto(UUID id, String name, String style, BigDecimal abv,
		MoneyDto price, BreweryRefDto brewery) {
}
