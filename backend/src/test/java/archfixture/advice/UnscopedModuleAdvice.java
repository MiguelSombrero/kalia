package archfixture.advice;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Violates {@code moduleAdviceDeclaresBasePackages}: no {@code basePackages}. */
@RestControllerAdvice
public class UnscopedModuleAdvice {

	@ExceptionHandler(IllegalStateException.class)
	ProblemDetail handle(IllegalStateException e) {
		return ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, e.getMessage());
	}

}
