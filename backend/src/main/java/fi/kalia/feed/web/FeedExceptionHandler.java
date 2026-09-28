package fi.kalia.feed.web;

import fi.kalia.feed.application.InvalidFeedCursorException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// ADR-0014.
@RestControllerAdvice(basePackages = "fi.kalia.feed.web")
class FeedExceptionHandler {

	@ExceptionHandler(InvalidFeedCursorException.class)
	ProblemDetail invalidCursor(InvalidFeedCursorException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, e.getMessage());
	}

}
