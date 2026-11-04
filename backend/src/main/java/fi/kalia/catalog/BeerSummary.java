package fi.kalia.catalog;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * A beer's name, brewery, style and strength, for a caller composing a line about it.
 * {@code withdrawn} marks a beer an operator rejected or removed, which only a read of the
 * viewer's own holdings returns (ADR-0091).
 */
public record BeerSummary(UUID id, String name, String brewery, String style, BigDecimal abv, boolean withdrawn) {

	public BeerSummary(UUID id, String name, String brewery, String style, BigDecimal abv) {
		this(id, name, brewery, style, abv, false);
	}

}
