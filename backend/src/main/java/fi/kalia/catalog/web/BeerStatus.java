package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.ModerationStatus;

/** What a beer read can report: the other storage values are never shown to anyone (ADR-0091). */
public enum BeerStatus {

	APPROVED,

	PENDING;

	static BeerStatus from(ModerationStatus stored) {
		return switch (stored) {
			case APPROVED -> APPROVED;
			case PENDING -> PENDING;
			case REJECTED, REMOVED -> throw new IllegalStateException("a " + stored + " beer is never read");
		};
	}

}
