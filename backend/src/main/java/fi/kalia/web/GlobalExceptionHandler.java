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

/**
 * Adds field-level detail to Bean Validation failures: Spring Boot's own
 * handling reports them as a bare {@code "Validation failure"} naming
 * neither the offending field nor the constraint. Every other generic MVC
 * exception is deliberately left to Boot's defaults, which already return
 * problem+json — see backend/README.md's error-handling convention and
 * ADR-0014. Never handles a type a module's own advice handles.
 */
// Boot's ProblemDetailsExceptionHandler (spring.mvc.problemdetails.enabled=true)
// targets these same exception types with no @Order of its own (defaults to
// LOWEST_PRECEDENCE) - without this class outranking it, it wins the resulting
// tie and these handlers never run.
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
