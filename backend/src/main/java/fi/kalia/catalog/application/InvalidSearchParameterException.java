package fi.kalia.catalog.application;

/**
 * Thrown for search parameters our API contract rejects. Its message is
 * written for API consumers and is exposed as ProblemDetail.detail —
 * see the error-handling convention in backend/README.md.
 */
public class InvalidSearchParameterException extends RuntimeException {

	public InvalidSearchParameterException(String message) {
		super(message);
	}

}
