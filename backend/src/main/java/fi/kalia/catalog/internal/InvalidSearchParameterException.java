package fi.kalia.catalog.internal;

/**
 * Thrown for search parameters our API contract rejects. Its message is
 * written for API consumers and is exposed as ProblemDetail.detail —
 * see the error-handling convention in backend/README.md.
 */
class InvalidSearchParameterException extends RuntimeException {

	InvalidSearchParameterException(String message) {
		super(message);
	}

}
