package fi.kalia.catalog.application;

public class TooManyPendingEntriesException extends RuntimeException {

	TooManyPendingEntriesException(int limit) {
		super("You already have %d suggestions waiting for review; add more once some are reviewed"
				.formatted(limit));
	}

}
