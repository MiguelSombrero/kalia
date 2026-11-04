package fi.kalia.catalog.web;

import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;

@Schema(description = """
		A 409: another contributor has already suggested this beer and it waits for review. \
		It names neither the contributor nor the beer, since the caller cannot open it""")
public class PendingElsewhereProblem extends Problem {

	PendingElsewhereProblem(String detail) {
		super(HttpStatus.CONFLICT, detail);
	}

}
