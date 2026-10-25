package archfixture.httpboundary;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Violates {@code HttpBoundaryTest}'s advice rule: an error body that could
 * carry a JPA entity, as a field, inside a collection, and nested one level
 * down. {@link #returnsACleanProblem} must not be reported. */
@RestControllerAdvice(basePackages = "archfixture.httpboundary")
public class EntityCarryingAdvice {

	public static class ProblemWithEntity extends ProblemDetail {

		private FixtureEntity existing;

		public FixtureEntity getExisting() {
			return existing;
		}

	}

	public record ProblemWithEntities(int status, List<FixtureEntity> existing) {
	}

	public record Wrapper(String label, ProblemWithEntities inner) {
	}

	@ExceptionHandler(IllegalArgumentException.class)
	ProblemWithEntity returnsAProblemCarryingAnEntity() {
		return null;
	}

	@ExceptionHandler(IllegalStateException.class)
	ProblemWithEntities returnsAProblemCarryingAListOfEntities() {
		return null;
	}

	@ExceptionHandler(UnsupportedOperationException.class)
	Wrapper returnsAProblemNestingAnEntityTwoLevelsDown() {
		return null;
	}

	@ExceptionHandler(ArithmeticException.class)
	ProblemDetail returnsACleanProblem() {
		return ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
	}

	@ExceptionHandler(NullPointerException.class)
	ProblemDetail setsAnUntypedProperty() {
		ProblemDetail problem = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
		problem.setProperty("existing", new FixtureEntity());
		return problem;
	}

}
