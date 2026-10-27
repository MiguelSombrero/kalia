package fi.kalia.catalog.domain;

/** Stored by name in {@code catalog.*.moderation_status} (ADR-0091). */
public enum ModerationStatus {

	/** A contributor's row waiting for an operator: seen by that contributor alone. */
	PENDING,

	APPROVED,

	/** Refused while pending. Hidden from search and lists; the row stays. */
	REJECTED,

	/** Taken down after it was approved. Hidden from search and lists; the row stays. */
	REMOVED

}
