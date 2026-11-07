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

@Schema(description = "A suggestion as an admin decided it: approved or rejected")
public record SuggestionDecisionDto(
		@Schema(description = "The beer's id, which is also the suggestion's when it was one", requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Outcome outcome,
		@Schema(description = "When the decision was made", requiredMode = Schema.RequiredMode.REQUIRED) Instant decidedAt,
		@Schema(description = "Present on a rejection only") @Nullable RejectionReason reason,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String style,
		@Schema(description = "Alcohol by volume, percent", requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal abv,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) BreweryDto brewery,
		@Schema(description = """
				Where the brewery stands after the decision: still PENDING when another suggestion \
				that needs it is waiting""", requiredMode = Schema.RequiredMode.REQUIRED) ModerationStatus breweryStatus) {

	/** What a suggestion's decision can be; a removal has its own body, {@link BeerRemovalDto}. */
	public enum Outcome {

		APPROVED,

		REJECTED

	}

	static SuggestionDecisionDto from(SuggestionDecision decision) {
		Beer beer = decision.beer();
		return new SuggestionDecisionDto(beer.getId(), Outcome.valueOf(decision.outcome().name()), decision.decidedAt(), decision.reason(),
				beer.getName(), beer.getStyle(), beer.getAbv(), BreweryDto.from(decision.brewery()),
				decision.brewery().getModerationStatus());
	}

}
