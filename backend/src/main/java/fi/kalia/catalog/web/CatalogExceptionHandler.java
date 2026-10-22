package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BeerNotFoundException;
import fi.kalia.catalog.application.BreweryNotFoundException;
import fi.kalia.catalog.application.DuplicateBeerException;
import fi.kalia.catalog.application.DuplicateBreweryException;
import fi.kalia.catalog.application.InvalidSearchParameterException;
import fi.kalia.catalog.application.UnknownCountryException;
import fi.kalia.catalog.application.UnknownStyleException;
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
	ProblemDetail duplicateBeer(DuplicateBeerException e) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
		problem.setProperty("existingBeerId", e.getExistingBeerId());
		return problem;
	}

	@ExceptionHandler(DuplicateBreweryException.class)
	ProblemDetail duplicateBrewery(DuplicateBreweryException e) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
		problem.setProperty("existingBreweryId", e.getExistingBreweryId());
		return problem;
	}

	@ExceptionHandler(UnknownStyleException.class)
	ProblemDetail unknownStyle(UnknownStyleException e) {
		return validationFailed("style", e.getMessage());
	}

	@ExceptionHandler(UnknownCountryException.class)
	ProblemDetail unknownCountry(UnknownCountryException e) {
		return validationFailed("newBrewery.countryCode", e.getMessage());
	}

	@ExceptionHandler(BreweryChoiceException.class)
	ProblemDetail breweryChoice(BreweryChoiceException e) {
		return validationFailed("breweryId", e.getMessage());
	}

	// The shape GlobalExceptionHandler gives a Bean Validation failure, so a
	// client reads a field the catalog refuses the same way as a malformed one.
	private static ProblemDetail validationFailed(String field, String message) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
		problem.setProperty("errors", List.of(new FieldViolationDto(field, message)));
		return problem;
	}

}
