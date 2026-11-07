package fi.kalia.catalog.web;

import fi.kalia.catalog.application.PendingElsewhereException;
import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;

@Schema(description = """
		A 409: another contributor holds this beer, or this brewery, and it waits for review. \
		It names neither the contributor nor the entry, since the caller cannot open it""")
public class PendingElsewhereProblem extends Problem {

	private final PendingElsewhereException.Subject subject;

	PendingElsewhereProblem(String detail, PendingElsewhereException.Subject subject) {
		super(HttpStatus.CONFLICT, detail);
		this.subject = subject;
	}

	@Schema(description = "What the request duplicates: the beer, or the brewery added with it",
			requiredMode = Schema.RequiredMode.REQUIRED)
	public PendingElsewhereException.Subject getSubject() {
		return subject;
	}

}
