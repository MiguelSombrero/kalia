package fi.kalia.catalog;

import java.math.BigDecimal;
import java.util.UUID;

/** A beer's name, brewery, style and strength, for a caller composing a line about it. */
public record BeerSummary(UUID id, String name, String brewery, String style, BigDecimal abv) {

}
