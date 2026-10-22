package fi.kalia.catalog.web;

import static fi.kalia.catalog.web.AddBeerRequestDto.HAS_LETTER_OR_DIGIT;
import static fi.kalia.catalog.web.AddBeerRequestDto.HAS_LETTER_OR_DIGIT_MESSAGE;
import static fi.kalia.catalog.web.AddBeerRequestDto.MAX_NAME_LENGTH;
import static fi.kalia.catalog.web.AddBeerRequestDto.NO_CONTROL_CHARACTERS;
import static fi.kalia.catalog.web.AddBeerRequestDto.NO_CONTROL_CHARACTERS_MESSAGE;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

@Schema(description = "A brewery to add to the catalog together with a beer")
public record NewBreweryRequestDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = MAX_NAME_LENGTH)
		@NotBlank @Size(max = MAX_NAME_LENGTH)
		@Pattern(regexp = HAS_LETTER_OR_DIGIT, message = HAS_LETTER_OR_DIGIT_MESSAGE)
		@Pattern(regexp = NO_CONTROL_CHARACTERS, message = NO_CONTROL_CHARACTERS_MESSAGE) String name,
		@Schema(description = "One of the names listed by GET /api/v1/countries",
				requiredMode = Schema.RequiredMode.REQUIRED, maxLength = MAX_PLACE_LENGTH)
		@NotBlank @Size(max = MAX_PLACE_LENGTH) String country,
		@Schema(maxLength = MAX_PLACE_LENGTH) @Nullable @Size(max = MAX_PLACE_LENGTH)
		@Pattern(regexp = NO_CONTROL_CHARACTERS, message = NO_CONTROL_CHARACTERS_MESSAGE) String city) {

	private static final int MAX_PLACE_LENGTH = 100;

}
