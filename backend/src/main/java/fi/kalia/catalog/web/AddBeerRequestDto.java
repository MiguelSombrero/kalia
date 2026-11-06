package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BreweryChoice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "A beer to add to the catalog. Give exactly one of breweryId and newBrewery.")
public record AddBeerRequestDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = MAX_NAME_LENGTH) @BeerName String name,
		@Schema(description = "One of the catalog's styles, as listed by GET /api/v1/styles",
				requiredMode = Schema.RequiredMode.REQUIRED, maxLength = BeerStyle.MAX_LENGTH) @BeerStyle String style,
		@Schema(description = "Alcohol by volume, percent (0-" + BeerAbv.MAX + "), at most one decimal",
				requiredMode = Schema.RequiredMode.REQUIRED) @BeerAbv BigDecimal abv,
		@Schema(description = "A brewery the catalog already has") @Nullable UUID breweryId,
		@Schema(description = "A brewery the catalog lacks, added together with the beer")
		@Nullable @Valid NewBreweryRequestDto newBrewery) {

	static final int MAX_NAME_LENGTH = 200;

	static final String HAS_LETTER_OR_DIGIT = "(?s).*[\\p{L}\\p{N}].*";

	static final String HAS_LETTER_OR_DIGIT_MESSAGE = "must contain a letter or a digit";

	static final String NO_CONTROL_CHARACTERS = "[^\\p{Cc}\\p{Cf}]*";

	static final String NO_CONTROL_CHARACTERS_MESSAGE = "must not contain control or invisible formatting characters";

	BreweryChoice breweryChoice() {
		return BreweryChoiceException.choose(breweryId, newBrewery);
	}

}
