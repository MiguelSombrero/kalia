package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BeerNotFoundException;
import fi.kalia.catalog.application.BreweryNotFoundException;
import fi.kalia.catalog.application.DuplicateBeerException;
import fi.kalia.catalog.application.DuplicateBreweryException;
import fi.kalia.catalog.application.InvalidSearchParameterException;
import fi.kalia.catalog.application.TooManyPendingEntriesException;
import fi.kalia.catalog.application.UnknownCountryException;
import fi.kalia.catalog.application.UnknownStyleException;
import fi.kalia.web.FieldErrorDto;
import fi.kalia.web.ValidationProblem;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// ADR-0014.
@RestControllerAdvice(basePackages = "fi.kalia.catalog.web")
class CatalogExceptionHandler {

	@ExceptionHandler({BeerNotFoundException.class, BreweryNotFoundException.class})
	ProblemDetail notFound(RuntimeException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

	@ExceptionHandler(InvalidSearchParameterException.class)
	ProblemDetail invalidSearchParameter(InvalidSearchParameterException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

	@ExceptionHandler(DuplicateBeerException.class)
	DuplicateBeerProblem duplicateBeer(DuplicateBeerException e) {
		return new DuplicateBeerProblem(e.getMessage(), e.getExistingBeerId());
	}

	@ExceptionHandler(DuplicateBreweryException.class)
	DuplicateBreweryProblem duplicateBrewery(DuplicateBreweryException e) {
		return new DuplicateBreweryProblem(e.getMessage(), e.getExistingBreweryId(), e.getExistingBreweryName(),
				e.getExistingBreweryCountryCode());
	}

	@ExceptionHandler(TooManyPendingEntriesException.class)
	ProblemDetail tooManyPending(TooManyPendingEntriesException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.TOO_MANY_REQUESTS, e.getMessage());
	}

	@ExceptionHandler(UnknownStyleException.class)
	ValidationProblem unknownStyle(UnknownStyleException e) {
		return validationFailed("style", e.getMessage());
	}

	@ExceptionHandler(UnknownCountryException.class)
	ValidationProblem unknownCountry(UnknownCountryException e) {
		return validationFailed("newBrewery.countryCode", e.getMessage());
	}

	@ExceptionHandler(BreweryChoiceException.class)
	ValidationProblem breweryChoice(BreweryChoiceException e) {
		return validationFailed("breweryId", e.getMessage());
	}

	private static ValidationProblem validationFailed(String field, String message) {
		return new ValidationProblem(List.of(new FieldErrorDto(field, message)));
	}

}
