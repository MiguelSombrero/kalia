package fi.kalia.catalog.web;

import fi.kalia.catalog.domain.ModerationStatus;
import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.media.Schema;
import org.springframework.http.HttpStatus;

@Schema(description = "A 409: the beer is not approved, so it cannot be removed")
public class BeerNotApprovedProblem extends Problem {

	private final ModerationStatus moderationStatus;

	BeerNotApprovedProblem(String detail, ModerationStatus moderationStatus) {
		super(HttpStatus.CONFLICT, detail);
		this.moderationStatus = moderationStatus;
	}

	@Schema(description = "Where the beer stands: waiting, rejected, or removed already", requiredMode = Schema.RequiredMode.REQUIRED)
	public ModerationStatus getModerationStatus() {
		return moderationStatus;
	}

}
