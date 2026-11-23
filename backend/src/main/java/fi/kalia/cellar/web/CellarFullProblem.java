package fi.kalia.cellar.web;

import fi.kalia.cellar.application.CellarService;
import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;

@Schema(description = "A 422: the add would take the cellar past its limit, so none of it was added")
public class CellarFullProblem extends Problem {

	private final int limit;

	private final int remaining;

	CellarFullProblem(String detail, int limit, int remaining) {
		super(HttpStatus.UNPROCESSABLE_CONTENT, detail);
		this.limit = limit;
		this.remaining = remaining;
	}

	@Schema(description = "The most bottles a cellar holds", example = "" + CellarService.MAX_BOTTLES, requiredMode = Schema.RequiredMode.REQUIRED)
	public int getLimit() {
		return limit;
	}

	@Schema(description = "How many more bottles fit; zero when the cellar is full", minimum = "0",
			requiredMode = Schema.RequiredMode.REQUIRED)
	public int getRemaining() {
		return remaining;
	}

}
