package fi.kalia.notification.web;

import fi.kalia.notification.application.InvalidPageException;
import fi.kalia.notification.application.NotificationNotFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// ADR-0014.
@RestControllerAdvice(basePackages = "fi.kalia.notification.web")
class NotificationExceptionHandler {

	@ExceptionHandler(NotificationNotFoundException.class)
	ProblemDetail notFound(NotificationNotFoundException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, e.getMessage());
	}

	@ExceptionHandler(InvalidPageException.class)
	ProblemDetail invalidPage(InvalidPageException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

}
