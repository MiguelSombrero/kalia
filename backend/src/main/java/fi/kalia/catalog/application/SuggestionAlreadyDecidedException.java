package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.ReviewOutcome;
import java.time.Instant;
import java.util.Locale;
import org.jspecify.annotations.Nullable;

/** The suggestion is no longer waiting: an admin decided it, perhaps a moment ago (ADR-0102). */
public class SuggestionAlreadyDecidedException extends RuntimeException {

	private final ReviewOutcome outcome;

	private final @Nullable Instant decidedAt;

	SuggestionAlreadyDecidedException(ReviewOutcome outcome, @Nullable Instant decidedAt) {
		super("This suggestion was already decided: " + outcome.name().toLowerCase(Locale.ROOT));
		this.outcome = outcome;
		this.decidedAt = decidedAt;
	}

	public ReviewOutcome getOutcome() {
		return outcome;
	}

	/** Null for a suggestion decided before decisions were recorded. */
	public @Nullable Instant getDecidedAt() {
		return decidedAt;
	}

}
