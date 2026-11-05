package fi.kalia.catalog;

/**
 * Why an admin rejected a suggestion (ADR-0102), stored and published by name; a client
 * shows it in its reader's language.
 */
public enum RejectionReason {

	ALREADY_IN_CATALOG,

	NOT_A_REAL_BEER,

	INAPPROPRIATE,

	INCORRECT_DETAILS

}
