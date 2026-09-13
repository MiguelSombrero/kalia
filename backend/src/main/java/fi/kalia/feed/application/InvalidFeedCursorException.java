package fi.kalia.feed.application;

/**
 * Thrown for a "since" cursor the contract rejects — malformed, or well-formed
 * but never issued by the server. Its message is written for API consumers
 * and is exposed as {@code ProblemDetail.detail}.
 */
public class InvalidFeedCursorException extends RuntimeException {

	public InvalidFeedCursorException(String message) {
		super(message);
	}

}
