package fi.kalia.catalog.application;

import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.ReviewOutcome;
import java.time.Instant;
import org.jspecify.annotations.Nullable;

/** A suggestion as it stands once an admin decided it: the beer and the brewery after the decision. */
public record SuggestionDecision(Beer beer, Brewery brewery, ReviewOutcome outcome, @Nullable RejectionReason reason,
		Instant decidedAt) {
}
