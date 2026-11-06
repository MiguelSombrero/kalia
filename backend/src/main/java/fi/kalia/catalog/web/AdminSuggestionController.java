package fi.kalia.catalog.web;

import static fi.kalia.catalog.web.PageBounds.MAX_OFFSET;
import static fi.kalia.catalog.web.PageBounds.MAX_PAGE_SIZE;
import static fi.kalia.catalog.web.PageBounds.OFFSET_BOUND;
import static fi.kalia.catalog.web.PageBounds.PAGE_DESCRIPTION;
import static fi.kalia.catalog.web.PageBounds.requireBoundedOffset;

import fi.kalia.catalog.application.SuggestionReviewService;
import fi.kalia.identity.IdentityApi;
import fi.kalia.web.Problem;
import fi.kalia.web.ValidationProblem;
import org.jspecify.annotations.Nullable;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// The role is required by SecurityConfig's one rule on /api/v1/admin/** (ADR-0101), not here.
@RestController
@RequestMapping("/api/v1/admin/suggestions")
@RequiredArgsConstructor
@Tag(name = "Admin suggestions", description = "What users have added to the catalog and an admin reviews; admin role only")
@SecurityRequirement(name = "oauth2")
@ApiResponse(responseCode = "401", description = "Missing or invalid bearer token",
		content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
				schema = @Schema(implementation = Problem.class)))
@ApiResponse(responseCode = "403", description = "The caller does not hold the admin role",
		content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
				schema = @Schema(implementation = Problem.class)))
class AdminSuggestionController {

	private final SuggestionReviewService review;

	private final IdentityApi identity;

	@GetMapping
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@ApiResponse(responseCode = "400", description = "A page parameter is out of range, or the page skips more rows than allowed",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(oneOf = {ValidationProblem.class, Problem.class})))
	@Operation(summary = "List the suggestions waiting for review", description = """
			Every suggestion no admin has decided, the oldest first, with its beer, its brewery and \
			whether that brewery is new, its contributor's username, and how many of the contributor's \
			suggestions wait or were rejected. """ + OFFSET_BOUND)
	PageDto<SuggestionDto> listSuggestions(
			@Parameter(description = PAGE_DESCRIPTION)
			@RequestParam(defaultValue = "0") @Min(0) @Max(MAX_OFFSET) int page,
			@Parameter(description = "Page size, 1-" + MAX_PAGE_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
		requireBoundedOffset(page, size);
		return PageDto.from(review.pendingSuggestions(PageRequest.of(page, size)).map(SuggestionDto::from));
	}

	@GetMapping("/{id}")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@ApiResponses({
			@ApiResponse(responseCode = "400", description = "The id is not a UUID",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "404", description = """
					No suggestion is waiting under this id: it is unknown, was decided already, or is a \
					beer nobody suggested, such as an imported one""",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class)))})
	@Operation(summary = "Get a suggestion waiting for review",
			description = "One suggestion, as the list serves it, by its beer's id.")
	SuggestionDto getSuggestion(@Parameter(description = "The suggested beer's id") @PathVariable UUID id) {
		return SuggestionDto.from(review.pendingSuggestion(id));
	}

	@PostMapping("/{id}/approval")
	@ResponseStatus(HttpStatus.OK)
	@ApiResponses({
			@ApiResponse(responseCode = "400", description = "The id is not a UUID, or the body names a reason",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(oneOf = {ValidationProblem.class, Problem.class}))),
			@ApiResponse(responseCode = "404", description = """
					No suggestion is waiting under this id: it is unknown, or is a beer nobody suggested, \
					such as an imported one""",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "409", description = "The suggestion was decided already, or is being decided by another request",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = SuggestionAlreadyDecidedProblem.class)))})
	@Operation(summary = "Approve a suggestion as it is", description = """
			Makes the beer, and the brewery added with it, visible to everyone. A brewery another \
			suggestion needs is approved with the first approval. Takes no body.""")
	SuggestionDecisionDto approve(@Parameter(description = "The suggested beer's id") @PathVariable UUID id,
			@RequestBody(required = false) @Valid @Nullable ApproveSuggestionRequestDto body) {
		return SuggestionDecisionDto.from(review.approve(id, identity.requireCurrentUserId()));
	}

	@PostMapping("/{id}/edited-approval")
	@ResponseStatus(HttpStatus.OK)
	@ApiResponses({
			@ApiResponse(responseCode = "400", description = """
					The id is not a UUID; a field breaks the rules a beer is added under, such as a style \
					the catalog lacks, a country it does not list or a name with an invisible formatting \
					character; both or neither of breweryId and newBrewery are given; or newBrewery is \
					given for a suggestion that came with an existing brewery""",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(oneOf = {ValidationProblem.class, Problem.class}))),
			@ApiResponse(responseCode = "404", description = """
					No suggestion is waiting under this id: it is unknown, or is a beer nobody suggested, \
					such as an imported one; or breweryId names no approved brewery""",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "409", description = """
					The suggestion was decided already or is being decided by another request; the edit \
					duplicates a beer, or a brewery, the catalog holds in any status (the body names it); \
					or newBrewery edits a brewery another suggestion's approval has approved""",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(oneOf = {SuggestionAlreadyDecidedProblem.class, DuplicateBeerProblem.class,
									DuplicateBreweryProblem.class, Problem.class})))})
	@Operation(summary = "Edit a suggestion and approve it", description = """
			Applies the edit and approves the suggestion in one action, under the rules a beer is added \
			under, so what the contributor sees was checked as if they had entered it. Pointing the \
			beer at an existing brewery rejects the brewery it came with, unless another suggestion \
			still needs it. The review record keeps the values as suggested, and the event says the \
			suggestion was edited. A request equal to the suggestion is an approval as it is.""")
	SuggestionDecisionDto approveEdited(@Parameter(description = "The suggested beer's id") @PathVariable UUID id,
			@RequestBody @Valid EditSuggestionRequestDto body) {
		return SuggestionDecisionDto.from(review.approveEdited(id, identity.requireCurrentUserId(), body.edit()));
	}

	@PostMapping("/{id}/rejection")
	@ResponseStatus(HttpStatus.OK)
	@ApiResponses({
			@ApiResponse(responseCode = "400", description = "The id is not a UUID, or the reason is missing or not on the list",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(oneOf = {ValidationProblem.class, Problem.class}))),
			@ApiResponse(responseCode = "404", description = """
					No suggestion is waiting under this id: it is unknown, or is a beer nobody suggested, \
					such as an imported one""",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "409", description = "The suggestion was decided already, or is being decided by another request",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = SuggestionAlreadyDecidedProblem.class)))})
	@Operation(summary = "Reject a suggestion", description = """
			Withholds the beer for good, with a reason from a fixed list. The brewery added with it is \
			rejected too, unless another suggestion that needs it is still waiting; the last of them \
			rejects it. No row is deleted.""")
	SuggestionDecisionDto reject(@Parameter(description = "The suggested beer's id") @PathVariable UUID id,
			@RequestBody @Valid RejectSuggestionRequestDto body) {
		return SuggestionDecisionDto.from(review.reject(id, identity.requireCurrentUserId(), body.reason()));
	}

}
