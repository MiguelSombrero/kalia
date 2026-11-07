package fi.kalia.catalog.web;

import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.application.SuggestionDecision;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.ModerationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "An approved beer as an admin removed it")
public record BeerRemovalDto(
		@Schema(description = "The beer's id", requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Outcome outcome,
		@Schema(description = "When the removal was made", requiredMode = Schema.RequiredMode.REQUIRED) Instant decidedAt,
		@Schema(description = "Always absent: a removal gives no reason") @Nullable RejectionReason reason,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String style,
		@Schema(description = "Alcohol by volume, percent", requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal abv,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) BreweryDto brewery,
		@Schema(description = "Where the brewery stands, unchanged by the removal",
				requiredMode = Schema.RequiredMode.REQUIRED) ModerationStatus breweryStatus) {

	/** What a removal can be: only the one outcome. */
	public enum Outcome {

		REMOVED

	}

	static BeerRemovalDto from(SuggestionDecision decision) {
		Beer beer = decision.beer();
		return new BeerRemovalDto(beer.getId(), Outcome.valueOf(decision.outcome().name()), decision.decidedAt(),
				decision.reason(), beer.getName(), beer.getStyle(), beer.getAbv(), BreweryDto.from(decision.brewery()),
				decision.brewery().getModerationStatus());
	}

}
