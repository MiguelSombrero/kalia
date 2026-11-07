package fi.kalia.catalog.web;

import fi.kalia.catalog.application.SuggestionReviewService;
import fi.kalia.identity.IdentityApi;
import fi.kalia.web.Problem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// The role is required by SecurityConfig's one rule on /api/v1/admin/** (ADR-0101), not here.
@RestController
@RequestMapping("/api/v1/admin/beers")
@RequiredArgsConstructor
@Tag(name = "Admin beers", description = "Taking an approved beer down; admin role only")
@SecurityRequirement(name = "oauth2")
@ApiResponse(responseCode = "401", description = "Missing or invalid bearer token",
		content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
				schema = @Schema(implementation = Problem.class)))
@ApiResponse(responseCode = "403", description = "The caller does not hold the admin role",
		content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
				schema = @Schema(implementation = Problem.class)))
class AdminBeerController {

	private final SuggestionReviewService review;

	private final IdentityApi identity;

	@PostMapping("/{id}/removal")
	@ResponseStatus(HttpStatus.OK)
	@ApiResponses({
			@ApiResponse(responseCode = "400", description = "The id is not a UUID",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "404", description = "No beer has this id",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "409", description = """
					The beer is not approved: it is still waiting, was rejected, or was removed already, \
					perhaps by another admin a moment ago""",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = BeerNotApprovedProblem.class)))})
	@Operation(summary = "Remove an approved beer", description = """
			Withholds an approved beer, an imported one included, from search, lists and every public \
			view. A holder keeps their bottles and sees the beer unlinked. The beer's brewery stays as \
			it is and no row is deleted. Takes no body and no reason, and notifies nobody.""")
	BeerRemovalDto remove(@Parameter(description = "The beer's id") @PathVariable UUID id) {
		return BeerRemovalDto.from(review.remove(id, identity.requireCurrentUserId()));
	}

}
