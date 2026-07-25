package fi.kalia.web;

import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

/**
 * Handles generic Spring MVC exceptions no module owns: Bean Validation
 * failures, malformed requests, unsupported methods. Never handles a
 * type a module's own advice handles — see backend/README.md's
 * error-handling convention and ADR-0014.
 */
@RestControllerAdvice
@Slf4j
class GlobalExceptionHandler {

	@ExceptionHandler(HandlerMethodValidationException.class)
	ProblemDetail handleHandlerMethodValidation(HandlerMethodValidationException e) {
		List<FieldErrorDto> errors = e.getParameterValidationResults().stream()
				.map(result -> new FieldErrorDto(
						Objects.requireNonNullElse(result.getMethodParameter().getParameterName(), "value"),
						Objects.requireNonNullElse(
								result.getResolvableErrors().getFirst().getDefaultMessage(), "invalid value")))
				.toList();
		log.warn("Request parameter validation failed: {}", errors);
		ProblemDetail problem = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
		problem.setProperty("errors", errors);
		return problem;
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	ProblemDetail handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
		Set<HttpMethod> supported = e.getSupportedHttpMethods();
		String supportedText = supported == null ? "none" : supported.toString();
		log.warn("Unsupported method {} on this endpoint; supported: {}", e.getMethod(), supportedText);
		return ProblemDetail.forStatusAndDetail(HttpStatus.METHOD_NOT_ALLOWED,
				"Method '%s' not supported; supported methods: %s".formatted(e.getMethod(), supportedText));
	}

}
