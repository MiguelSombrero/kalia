package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BeerNotFoundException;
import fi.kalia.catalog.application.InvalidSearchParameterException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Handles only this module's exceptions designed as API responses, so only
 * curated messages reach {@code ProblemDetail.detail} (ADR-0014).
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
