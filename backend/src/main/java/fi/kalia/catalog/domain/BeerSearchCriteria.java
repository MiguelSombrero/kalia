package fi.kalia.catalog.domain;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** {@code nameWords}: null is no filter, an empty list matches no beer. */
public record BeerSearchCriteria(@Nullable String query, @Nullable String style,
		@Nullable UUID breweryId, @Nullable String countryCode,
		@Nullable BigDecimal minAbv, @Nullable BigDecimal maxAbv,
		@Nullable List<String> nameWords) {

	public BeerSearchCriteria(@Nullable String query, @Nullable String style,
			@Nullable UUID breweryId, @Nullable String countryCode,
			@Nullable BigDecimal minAbv, @Nullable BigDecimal maxAbv) {
		this(query, style, breweryId, countryCode, minAbv, maxAbv, null);
	}

}
