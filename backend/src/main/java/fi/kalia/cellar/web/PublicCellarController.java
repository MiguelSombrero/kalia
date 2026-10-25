package fi.kalia.cellar.web;

import fi.kalia.cellar.application.CellarService;
import fi.kalia.web.Problem;
import fi.kalia.web.ValidationProblem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// cellar owns the data, so it owns this read, and CellarService enforces
// visibility (ADR-0049, ADR-0050). No @SecurityRequirement — the one
// cellar route a signed-out caller may reach, made public in SecurityConfig.
@RestController
@RequestMapping("/api/v1/cellars")
@RequiredArgsConstructor
@Tag(name = "Public cellar", description = "A cellar its owner has made public, addressed by username")
class PublicCellarController {

	/** Keycloak's default user profile caps a username at 255 characters, and profile copies it verbatim. */
	static final int MAX_USERNAME_LENGTH = 255;

	/** A page holds at most this many beers, each with at most {@value CellarService#MAX_PUBLIC_BOTTLES_PER_ENTRY} bottles: one response stays under 1,250 bottles however large the cellar. */
	static final int MAX_PAGE_SIZE = 50;

	/** A screenful of beers and a few dozen bottle tiles before the visitor pages on. */
	static final int DEFAULT_PAGE_SIZE = 20;

	/** With the size cap, a request skips at most 9,950 beers: the offset scan stays a bounded index range, and no real cellar is larger. */
	static final int MAX_PAGE = 199;

	private final CellarService cellar;

	@GetMapping("/{username}")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Read a public cellar",
			description = "One page of the beers in the cellar, in the order they were added, and the bottles owned of "
					+ "each. A request without paging parameters gets the first page of " + DEFAULT_PAGE_SIZE
					+ " beers. A beer lists at most " + CellarService.MAX_PUBLIC_BOTTLES_PER_ENTRY
					+ " bottles, its oldest; its quantity says how many are held. 404 — identical for every "
					+ "caller, the owner included — when the username is unknown or the cellar is not public, "
					+ "so neither can be told from the other.")
	@ApiResponse(responseCode = "400", description = "The username is longer than any username can be, or a page parameter is out of range",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(implementation = ValidationProblem.class)))
	@ApiResponse(responseCode = "404", description = "No public cellar for this username",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(implementation = Problem.class)))
	PublicCellarDto read(
			@Parameter(description = "The owner's username") @PathVariable @Size(max = MAX_USERNAME_LENGTH) String username,
			@Parameter(description = "Zero-based page index, at most " + MAX_PAGE)
			@RequestParam(defaultValue = "0") @Min(0) @Max(MAX_PAGE) int page,
			@Parameter(description = "Beers per page, 1-" + MAX_PAGE_SIZE)
			@RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) @Min(1) @Max(MAX_PAGE_SIZE) int size) {
		return PublicCellarDto.of(username, cellar.readPublicCellar(username, PageRequest.of(page, size)));
	}

}
