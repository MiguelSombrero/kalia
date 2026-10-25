package fi.kalia.profile.web;

import fi.kalia.identity.IdentityApi;
import fi.kalia.profile.application.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/profile")
@RequiredArgsConstructor
@Tag(name = "Profile", description = "The signed-in caller's own profile")
@SecurityRequirement(name = "oauth2")
// Do not drop `content = @Content()`: without it, springdoc defaults this
// 401 to the operation's own success schema instead (backend/README.md traps).
@ApiResponse(responseCode = "401", description = "Missing or invalid bearer token", content = @Content())
@ApiResponse(responseCode = "409", description = "The caller has no profile yet, and its username belongs to another account",
		content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
				schema = @Schema(implementation = ProblemDetail.class)))
class ProfileController {

	private final ProfileService profile;

	private final IdentityApi identity;

	@GetMapping
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Read the caller's own profile",
			description = """
					Creates the caller's profile the first time it is needed. The caller is always \
					resolved from the bearer token, so this can never affect anyone else's profile. A \
					username is never given to a second account, even after the first is deleted: 409 \
					when the token's username is already held.\
					""")
	ProfileDto myProfile() {
		return ProfileDto.from(profile.currentProfile(identity.requireCurrentUserId(), identity.requireCurrentUsername()));
	}

	@PatchMapping("/visibility")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Change the caller's cellar visibility",
			description = """
					Creates the caller's profile the first time it is needed. The caller is always \
					resolved from the bearer token, so this can never affect anyone else's profile. A \
					username is never given to a second account, even after the first is deleted: 409 \
					when the token's username is already held.\
					""")
	ProfileDto changeVisibility(@Valid @RequestBody ChangeVisibilityRequestDto request) {
		return ProfileDto.from(profile.changeCellarVisibility(identity.requireCurrentUserId(), identity.requireCurrentUsername(),
				request.cellarPublic()));
	}

}
