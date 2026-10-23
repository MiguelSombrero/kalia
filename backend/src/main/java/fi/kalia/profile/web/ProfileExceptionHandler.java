package fi.kalia.profile.web;

import fi.kalia.profile.application.UsernameTakenException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

// ADR-0014.
@RestControllerAdvice(basePackages = "fi.kalia.profile.web")
class ProfileExceptionHandler {

	@ExceptionHandler(UsernameTakenException.class)
	ProblemDetail usernameTaken(UsernameTakenException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.CONFLICT, e.getMessage());
	}

}
