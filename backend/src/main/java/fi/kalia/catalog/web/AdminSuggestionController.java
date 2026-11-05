package fi.kalia.catalog.web;

import static fi.kalia.catalog.web.PageBounds.MAX_OFFSET;
import static fi.kalia.catalog.web.PageBounds.MAX_PAGE_SIZE;
import static fi.kalia.catalog.web.PageBounds.OFFSET_BOUND;
import static fi.kalia.catalog.web.PageBounds.PAGE_DESCRIPTION;
import static fi.kalia.catalog.web.PageBounds.requireBoundedOffset;

import fi.kalia.catalog.application.SuggestionReviewService;
import fi.kalia.web.Problem;
import fi.kalia.web.ValidationProblem;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.util.UUID;
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

}
