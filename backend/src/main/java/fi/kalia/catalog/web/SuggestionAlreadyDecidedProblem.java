package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.ReviewOutcome;
import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import org.jspecify.annotations.Nullable;
import org.springframework.http.HttpStatus;

@Schema(description = "A 409: the suggestion was decided already, perhaps by a decision a moment ahead of this one")
public class SuggestionAlreadyDecidedProblem extends Problem {

	private final ReviewOutcome outcome;

	private final @Nullable Instant decidedAt;

	SuggestionAlreadyDecidedProblem(String detail, ReviewOutcome outcome, @Nullable Instant decidedAt) {
		super(HttpStatus.CONFLICT, detail);
		this.outcome = outcome;
		this.decidedAt = decidedAt;
	}

	@Schema(description = "How the suggestion was decided", requiredMode = Schema.RequiredMode.REQUIRED)
	public ReviewOutcome getOutcome() {
		return outcome;
	}

	@Schema(description = "When, absent for a suggestion decided before decisions were recorded")
	public @Nullable Instant getDecidedAt() {
		return decidedAt;
	}

}
