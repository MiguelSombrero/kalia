package fi.kalia.cellar.web;

import fi.kalia.cellar.application.BeerNotFoundException;
import fi.kalia.cellar.application.BottleNotFoundException;
import fi.kalia.cellar.application.EntryNotFoundException;
import fi.kalia.cellar.application.InvalidBottleException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * Handles only this module's exceptions designed as API responses, so only
 * curated messages reach {@code ProblemDetail.detail} (ADR-0014). Every
 * not-found case here — a missing beer, entry or bottle, or one belonging to
 * someone else — answers 404 uniformly.
 */
@RestControllerAdvice
class CellarExceptionHandler {

	@ExceptionHandler({BeerNotFoundException.class, EntryNotFoundException.class, BottleNotFoundException.class})
	ProblemDetail notFound(RuntimeException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

	@ExceptionHandler(InvalidBottleException.class)
	ProblemDetail invalidBottle(InvalidBottleException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

}
