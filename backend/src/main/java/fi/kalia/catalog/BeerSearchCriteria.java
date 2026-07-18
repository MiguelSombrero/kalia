package fi.kalia.catalog;

import java.math.BigDecimal;
import java.util.UUID;

public record BeerSearchCriteria(String query, String style, UUID breweryId,
		String country, BigDecimal minAbv, BigDecimal maxAbv) {
}
