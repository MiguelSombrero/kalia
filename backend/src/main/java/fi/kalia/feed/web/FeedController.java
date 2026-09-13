package fi.kalia.feed.web;

import fi.kalia.feed.application.FeedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// Public: identical for every caller, signed in or out (ADR-0028) — every
// event's cellar is public by the time it is served, so there is nothing a
// bearer token would change about the answer.
@RestController
@RequestMapping("/api/v1/feed")
@RequiredArgsConstructor
@Tag(name = "Feed", description = "Recent cellar activity from cellars their owners made public")
class FeedController {

	// One less than CatalogApi/ProfileApi's own batch-id cap (ADR-0042): the
	// lookahead row FeedService fetches beyond a full page can push the
	// number of distinct beer or user ids to size + 1, and that must never
	// cross what those batch reads accept.
	private static final int MAX_SIZE = 99;

	private final FeedService feed;

	@GetMapping
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Read the feed", description = """
			The most recent events, newest first, each naming the person and the beer. Identical for every \
			caller, signed in or out: only events whose owner's cellar is currently public are served, so \
			there is nothing left to vary by caller. A page may carry fewer lines than requested — a line \
			whose beer or person no longer resolves is dropped rather than rendered blank.""")
	@ApiResponse(responseCode = "400", description = "size is missing, non-numeric, or outside 1-" + MAX_SIZE,
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(implementation = ProblemDetail.class)))
	FeedPageDto readFeed(
			@Parameter(description = "Page size, 1-" + MAX_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_SIZE) int size) {
		return FeedPageDto.from(feed.readRecent(size));
	}

}
