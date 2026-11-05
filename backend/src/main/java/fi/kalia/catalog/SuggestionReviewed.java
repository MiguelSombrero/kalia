package fi.kalia.catalog;

import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Published once per decision on a suggestion, whether or not its brewery was new
 * (ADR-0102). {@code beerId} names the suggestion, since its id is its beer's. {@code
 * eventId} is the event's own identity, which a consumer keys idempotent handling on
 * (ADR-0058). {@code suggestedName} is present only when {@code edited}; {@code reason}
 * only on a rejection.
 */
public record SuggestionReviewed(UUID eventId, UUID contributorId, UUID beerId, Outcome outcome,
		String beerName, boolean edited, @Nullable String suggestedName, @Nullable RejectionReason reason,
		Instant occurredAt) {

	public enum Outcome {

		APPROVED,

		REJECTED

	}

}
