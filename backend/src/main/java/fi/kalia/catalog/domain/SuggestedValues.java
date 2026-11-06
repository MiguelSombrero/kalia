package fi.kalia.catalog.domain;

import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * A suggestion as its contributor made it, taken before an admin's edit changes it
 * (ADR-0102). The brewery's name, country and city are present only when the brewery was new.
 */
public record SuggestedValues(String beerName, String style, BigDecimal abv, UUID breweryId,
		@Nullable String breweryName, @Nullable String breweryCountryCode, @Nullable String breweryCity) {

	public static SuggestedValues of(Beer beer) {
		Brewery brewery = beer.getBrewery();
		boolean isNew = brewery.getModerationStatus() == ModerationStatus.PENDING;
		return new SuggestedValues(beer.getName(), beer.getStyle(), beer.getAbv(), brewery.getId(),
				isNew ? brewery.getName() : null, isNew ? brewery.getCountryCode() : null,
				isNew ? brewery.getCity() : null);
	}

}
