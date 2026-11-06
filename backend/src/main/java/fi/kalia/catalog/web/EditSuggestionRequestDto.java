package fi.kalia.catalog.web;

import fi.kalia.catalog.application.SuggestionEdit;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = """
		Every field of a suggestion as the admin wants it decided, whether or not it changes: the beer's \
		name, style and ABV, and the brewery. Give exactly one of breweryId, to approve the beer under a \
		brewery the catalog has, and newBrewery, the fields of the brewery the suggestion came with. \
		A request equal to the suggestion is an approval as it is.""")
public record EditSuggestionRequestDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, maxLength = AddBeerRequestDto.MAX_NAME_LENGTH) @BeerName String name,
		@Schema(description = "One of the catalog's styles, as listed by GET /api/v1/styles",
				requiredMode = Schema.RequiredMode.REQUIRED, maxLength = BeerStyle.MAX_LENGTH) @BeerStyle String style,
		@Schema(description = "Alcohol by volume, percent (0-" + BeerAbv.MAX + "), at most one decimal",
				requiredMode = Schema.RequiredMode.REQUIRED) @BeerAbv BigDecimal abv,
		@Schema(description = "An approved brewery to approve the beer under, which may replace the one it came with")
		@Nullable UUID breweryId,
		@Schema(description = "The fields of the new brewery the suggestion came with; only while no approval has approved it")
		@Nullable @Valid NewBreweryRequestDto newBrewery) {

	SuggestionEdit edit() {
		return new SuggestionEdit(name, style, abv, BreweryChoiceException.choose(breweryId, newBrewery));
	}

}
