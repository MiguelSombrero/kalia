package fi.kalia.catalog.application;

/** The brewery came with the suggestion but a sibling's approval has approved it since (ADR-0102). */
public class BreweryApprovedAlreadyException extends RuntimeException {

	BreweryApprovedAlreadyException() {
		super("Another suggestion's approval approved this brewery; point the beer at it by id instead of editing it");
	}

}
