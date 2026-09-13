package fi.kalia.feed.application;

/**
 * Thrown for a "since" or "before" cursor the contract rejects — malformed,
 * well-formed but never issued by the server, or both given at once. Its
 * message is written for API consumers and is exposed as
 * {@code ProblemDetail.detail}.
 */
public class InvalidFeedCursorException extends RuntimeException {

	public InvalidFeedCursorException(String message) {
		super(message);
	}

}
