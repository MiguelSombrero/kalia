package fi.kalia.catalog.web;

import fi.kalia.catalog.application.Suggestion;
import fi.kalia.catalog.domain.Beer;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Schema(description = "A beer a user added, waiting for an admin to review it, with the brewery added with it")
public record SuggestionDto(
		@Schema(description = "The suggested beer's id, which is the suggestion's", requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String style,
		@Schema(description = "Alcohol by volume, percent", requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal abv,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) BreweryDto brewery,
		@Schema(description = "True when the brewery was added with the beer and waits for review too",
				requiredMode = Schema.RequiredMode.REQUIRED) boolean breweryIsNew,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) SuggestionContributorDto contributor,
		@Schema(description = "When the beer was added", requiredMode = Schema.RequiredMode.REQUIRED) Instant suggestedAt) {

	static SuggestionDto from(Suggestion suggestion) {
		Beer beer = suggestion.beer();
		return new SuggestionDto(beer.getId(), beer.getName(), beer.getStyle(), beer.getAbv(),
				BreweryDto.from(beer.getBrewery()), suggestion.breweryIsNew(),
				new SuggestionContributorDto(suggestion.contributorUsername(), suggestion.contributorPendingCount(),
						suggestion.contributorRejectedCount()),
				beer.getCreatedAt());
	}

}
