package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BreweryChoice;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "A beer to add to the catalog. Give exactly one of breweryId and newBrewery.")
public record AddBeerRequestDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = MAX_NAME_LENGTH)
		@NotBlank @Size(max = MAX_NAME_LENGTH)
		@Pattern(regexp = HAS_LETTER_OR_DIGIT, message = HAS_LETTER_OR_DIGIT_MESSAGE)
		@Pattern(regexp = NO_CONTROL_CHARACTERS, message = NO_CONTROL_CHARACTERS_MESSAGE) String name,
		@Schema(description = "One of the catalog's styles, as listed by GET /api/v1/styles",
				requiredMode = Schema.RequiredMode.REQUIRED, maxLength = MAX_STYLE_LENGTH)
		@NotBlank @Size(max = MAX_STYLE_LENGTH) String style,
		@Schema(description = "Alcohol by volume, percent (0-" + MAX_ABV + "), at most one decimal",
				requiredMode = Schema.RequiredMode.REQUIRED)
		@NotNull @DecimalMin(MIN_ABV) @DecimalMax(MAX_ABV)
		@Digits(integer = ABV_INTEGER_DIGITS, fraction = ABV_FRACTION_DIGITS) BigDecimal abv,
		@Schema(description = "A brewery the catalog already has") @Nullable UUID breweryId,
		@Schema(description = "A brewery the catalog lacks, added together with the beer")
		@Nullable @Valid NewBreweryRequestDto newBrewery) {

	static final int MAX_NAME_LENGTH = 200;

	static final String HAS_LETTER_OR_DIGIT = "(?s).*[\\p{L}\\p{N}].*";

	static final String HAS_LETTER_OR_DIGIT_MESSAGE = "must contain a letter or a digit";

	static final String NO_CONTROL_CHARACTERS = "[^\\p{Cc}\\p{Cf}]*";

	static final String NO_CONTROL_CHARACTERS_MESSAGE = "must not contain control or invisible formatting characters";

	private static final int MAX_STYLE_LENGTH = 100;

	private static final String MIN_ABV = "0";

	private static final String MAX_ABV = "100";

	// catalog.beer.abv is numeric(4, 1): PostgreSQL would round a second decimal silently.
	private static final int ABV_INTEGER_DIGITS = 3;

	private static final int ABV_FRACTION_DIGITS = 1;

	BreweryChoice breweryChoice() {
		if (breweryId != null && newBrewery == null) {
			return new BreweryChoice.Existing(breweryId);
		}
		if (breweryId == null && newBrewery != null) {
			return new BreweryChoice.New(newBrewery.name(), newBrewery.countryCode(), newBrewery.city());
		}
		throw new BreweryChoiceException();
	}

}
