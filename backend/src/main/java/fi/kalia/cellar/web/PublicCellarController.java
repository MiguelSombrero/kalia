package fi.kalia.cellar.web;

import fi.kalia.cellar.application.CellarService;
import fi.kalia.cellar.application.PublicCellarNotFoundException;
import fi.kalia.profile.ProfileApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// cellar owns the data, so it owns this read; it resolves the username and
// visibility through profile (ADR-0049). No @SecurityRequirement — the one
// cellar route a signed-out caller may reach, made public in SecurityConfig.
@RestController
@RequestMapping("/api/v1/cellars")
@RequiredArgsConstructor
@Tag(name = "Public cellar", description = "A cellar its owner has made public, addressed by username")
class PublicCellarController {

	private final CellarService cellar;

	private final ProfileApi profile;

	@GetMapping("/{username}")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Read a public cellar",
			description = """
					The beers in the cellar and the bottles owned of each. 404 — identical for every caller, \
					the owner included — when the username is unknown or the cellar is not public, so neither \
					can be told from the other.\
					""")
	@ApiResponse(responseCode = "404", description = "No public cellar for this username",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(implementation = ProblemDetail.class)))
	PublicCellarDto read(@Parameter(description = "The owner's username") @PathVariable String username) {
		UUID ownerId = profile.publicCellarOwnerId(username)
				.orElseThrow(PublicCellarNotFoundException::new);
		return PublicCellarDto.of(username, cellar.readPublicCellar(ownerId));
	}

}
