package fi.kalia.catalog.domain;

import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

public record BeerSearchCriteria(@Nullable String query, @Nullable String style,
		@Nullable UUID breweryId, @Nullable String country,
		@Nullable BigDecimal minAbv, @Nullable BigDecimal maxAbv) {
}
