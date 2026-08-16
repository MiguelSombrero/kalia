package fi.kalia.web;

import java.util.List;
import java.util.Objects;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

// Adds field-level detail to Bean Validation failures; every other generic
// MVC exception is left to Spring Boot's defaults (ADR-0014).
// Do not remove the @Order: Boot's own ProblemDetailsExceptionHandler targets
// these same exception types at LOWEST_PRECEDENCE, and without this class
// outranking it, it wins the tie and these handlers silently never run.
@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
@Slf4j
class GlobalExceptionHandler {

	/** Query and path parameter constraints (Spring's native validation path). */
	@ExceptionHandler(HandlerMethodValidationException.class)
	ProblemDetail handleHandlerMethodValidation(HandlerMethodValidationException e) {
		List<FieldErrorDto> errors = e.getParameterValidationResults().stream()
				.map(result -> new FieldErrorDto(
						Objects.requireNonNullElse(result.getMethodParameter().getParameterName(), "value"),
						Objects.requireNonNullElse(
								result.getResolvableErrors().getFirst().getDefaultMessage(), "invalid value")))
				.toList();
		log.warn("Request parameter validation failed: {}", errors);
		return validationFailed(errors);
	}

	/** {@code @Valid @RequestBody} field constraints. */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	ProblemDetail handleMethodArgumentNotValid(MethodArgumentNotValidException e) {
		List<FieldErrorDto> errors = e.getFieldErrors().stream()
				.map(fe -> new FieldErrorDto(fe.getField(),
						Objects.requireNonNullElse(fe.getDefaultMessage(), "invalid value")))
				.toList();
		log.warn("Request body validation failed: {}", errors);
		return validationFailed(errors);
	}

	private static ProblemDetail validationFailed(List<FieldErrorDto> errors) {
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
		problem.setProperty("errors", errors);
		return problem;
	}

}
