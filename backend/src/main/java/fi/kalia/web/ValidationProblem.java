package fi.kalia.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.http.HttpStatus;

/** The one shape of a 400 that names the fields it refuses, whichever module refused them. */
@Schema(description = "A 400 naming each field the request got wrong")
public class ValidationProblem extends Problem {

	public static final String DETAIL = "Validation failed";

	private final List<FieldErrorDto> errors;

	public ValidationProblem(List<FieldErrorDto> errors) {
		super(HttpStatus.BAD_REQUEST, DETAIL);
		this.errors = errors;
	}

	@Schema(requiredMode = Schema.RequiredMode.REQUIRED)
	public List<FieldErrorDto> getErrors() {
		return errors;
	}

}
