package fi.kalia.profile.web;

import fi.kalia.profile.application.ProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
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
class ProfileController {

	private final ProfileService profile;

	@GetMapping
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Read the caller's own profile",
			description = """
					Creates the caller's profile the first time it is needed. The caller is always \
					resolved from the bearer token, so this can never affect anyone else's profile.\
					""")
	ProfileDto myProfile(@AuthenticationPrincipal Jwt jwt) {
		return ProfileDto.from(profile.currentProfile(currentUserId(jwt), currentUsername(jwt)));
	}

	@PatchMapping("/visibility")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Change the caller's cellar visibility",
			description = """
					Creates the caller's profile the first time it is needed. The caller is always \
					resolved from the bearer token, so this can never affect anyone else's profile.\
					""")
	ProfileDto changeVisibility(@AuthenticationPrincipal Jwt jwt, @Valid @RequestBody ChangeVisibilityRequestDto request) {
		return ProfileDto.from(profile.changeCellarVisibility(currentUserId(jwt), currentUsername(jwt), request.cellarPublic()));
	}

	// profile depends on no other module (ADR-0049), so it resolves the
	// caller from the token itself rather than through identity's
	// CurrentUserService.
	private static UUID currentUserId(Jwt jwt) {
		return UUID.fromString(jwt.getSubject());
	}

	private static String currentUsername(Jwt jwt) {
		String username = jwt.getClaimAsString("preferred_username");
		if (username == null) {
			throw new IllegalStateException(
					("Access token for subject %s carries no preferred_username claim. The realm's "
							+ "client is missing the built-in profile scope.").formatted(jwt.getSubject()));
		}
		return username;
	}

}
