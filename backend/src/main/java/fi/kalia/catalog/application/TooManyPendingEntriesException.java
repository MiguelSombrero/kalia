package fi.kalia.catalog.application;

public class TooManyPendingEntriesException extends RuntimeException {

	TooManyPendingEntriesException(int limit) {
		super("You already have %d entries waiting for review; add more once some are approved or rejected"
				.formatted(limit));
	}

}
