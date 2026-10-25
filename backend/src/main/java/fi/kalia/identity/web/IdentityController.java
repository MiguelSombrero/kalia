package fi.kalia.identity.web;

import fi.kalia.identity.application.CurrentUserService;
import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Identity", description = "The authenticated caller")
@SecurityRequirement(name = "oauth2")
@ApiResponse(responseCode = "401", description = "Missing or invalid bearer token",
		content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE, schema = @Schema(implementation = Problem.class)))
class IdentityController {

	private final CurrentUserService currentUser;

	@GetMapping("/me")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Get the current user",
			description = "Returns the caller identified by the bearer token. Responds 401 when the request carries no valid token.")
	CurrentUserDto me() {
		return CurrentUserDto.from(currentUser.require());
	}

}
