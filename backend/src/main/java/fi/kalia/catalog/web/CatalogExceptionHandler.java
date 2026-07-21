package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BeerNotFoundException;
import fi.kalia.catalog.application.InvalidSearchParameterException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Only exception types designed as API responses are handled here, so only
 * curated messages ever reach ProblemDetail.detail. Anything unexpected
 * falls through to Spring Boot's default handling: a 500 problem response
 * without a message, logged server-side. Convention: backend/README.md.
 */
@RestControllerAdvice
class CatalogExceptionHandler {

	@ExceptionHandler(BeerNotFoundException.class)
	ProblemDetail beerNotFound(BeerNotFoundException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

	@ExceptionHandler(InvalidSearchParameterException.class)
	ProblemDetail invalidSearchParameter(InvalidSearchParameterException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

}
