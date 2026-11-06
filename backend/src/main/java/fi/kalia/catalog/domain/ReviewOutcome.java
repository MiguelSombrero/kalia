package fi.kalia.catalog.domain;

import java.util.Optional;

/** What a decision on a contributed beer did to it; stored by name in {@code catalog.review.outcome}. */
public enum ReviewOutcome {

	APPROVED,

	REJECTED,

	REMOVED;

	/** How a beer that is no longer waiting got there, or empty for one that is still waiting. */
	public static Optional<ReviewOutcome> decidedAs(ModerationStatus status) {
		return switch (status) {
			case PENDING -> Optional.empty();
			case APPROVED -> Optional.of(APPROVED);
			case REJECTED -> Optional.of(REJECTED);
			case REMOVED -> Optional.of(REMOVED);
		};
	}

}
