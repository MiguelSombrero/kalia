package fi.kalia.catalog.application;

/**
 * Thrown for search parameters the API contract rejects. Its message is
 * written for API consumers and is exposed as {@code ProblemDetail.detail}.
 */
public class InvalidSearchParameterException extends RuntimeException {

	public InvalidSearchParameterException(String message) {
		super(message);
	}

}
