package fi.kalia.catalog.web;

import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import org.springframework.http.HttpStatus;

@Schema(description = "A 409: the catalog already has this beer")
public class DuplicateBeerProblem extends Problem {

	private final UUID existingBeerId;

	DuplicateBeerProblem(String detail, UUID existingBeerId) {
		super(HttpStatus.CONFLICT, detail);
		this.existingBeerId = existingBeerId;
	}

	@Schema(description = "The beer the request duplicates", requiredMode = Schema.RequiredMode.REQUIRED)
	public UUID getExistingBeerId() {
		return existingBeerId;
	}

}
