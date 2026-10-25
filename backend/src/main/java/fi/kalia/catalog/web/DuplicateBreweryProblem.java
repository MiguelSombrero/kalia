package fi.kalia.catalog.web;

import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import org.springframework.http.HttpStatus;

@Schema(description = "A 409: the catalog already has this brewery, named as the catalog spells it")
public class DuplicateBreweryProblem extends Problem {

	private final UUID existingBreweryId;

	private final String existingBreweryName;

	private final String existingBreweryCountryCode;

	DuplicateBreweryProblem(String detail, UUID existingBreweryId, String existingBreweryName,
			String existingBreweryCountryCode) {
		super(HttpStatus.CONFLICT, detail);
		this.existingBreweryId = existingBreweryId;
		this.existingBreweryName = existingBreweryName;
		this.existingBreweryCountryCode = existingBreweryCountryCode;
	}

	@Schema(description = "The brewery the request duplicates", requiredMode = Schema.RequiredMode.REQUIRED)
	public UUID getExistingBreweryId() {
		return existingBreweryId;
	}

	@Schema(description = "That brewery's name, spelled as the catalog holds it",
			requiredMode = Schema.RequiredMode.REQUIRED)
	public String getExistingBreweryName() {
		return existingBreweryName;
	}

	@Schema(description = "That brewery's country, an ISO 3166-1 alpha-2 code",
			requiredMode = Schema.RequiredMode.REQUIRED)
	public String getExistingBreweryCountryCode() {
		return existingBreweryCountryCode;
	}

}
