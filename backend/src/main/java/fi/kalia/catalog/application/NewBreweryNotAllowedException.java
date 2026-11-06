package fi.kalia.catalog.application;

/** An edit cannot add a brewery to a suggestion that came with an existing one (ADR-0102). */
public class NewBreweryNotAllowedException extends RuntimeException {

	NewBreweryNotAllowedException() {
		super("this suggestion came with an existing brewery, so it cannot be given a new one");
	}

}
