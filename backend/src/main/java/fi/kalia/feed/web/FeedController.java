package fi.kalia.feed.web;

import fi.kalia.feed.application.FeedService;
import fi.kalia.feed.application.InvalidFeedCursorException;
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
import org.jspecify.annotations.Nullable;
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

	// A signed cursor is a base64url sequence number, a ".", and a
	// base64url HMAC-SHA256 (FeedCursorCodec) — at most 26 + 1 + 43 = 70
	// characters; rounded up with margin for the encoding to change.
	private static final int MAX_CURSOR_LENGTH = 96;

	private final FeedService feed;

	@GetMapping
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Read the feed", description = """
			Without since or before: the most recent events, newest first, each naming the person and the beer. \
			With since, an opaque cursor from a previous line: every event recorded after it instead, still \
			newest first, capped at size and marked startOver if the cursor has aged past the served window — \
			the increment a page that is already open polls for. With before, an opaque cursor from a previous \
			line: every event recorded before it instead, still newest first and capped at size — how a page \
			already open continues toward older history as its visitor scrolls. since and before are mutually \
			exclusive. Identical for every caller, signed in or out: only events whose owner's cellar is \
			currently public are served, so there is nothing left to vary by caller. A page may carry fewer \
			lines than requested — a line whose beer or person no longer resolves is dropped rather than \
			rendered blank.""")
	@ApiResponse(responseCode = "400",
			description = "size is missing, non-numeric, or outside 1-" + MAX_SIZE + """
					; since or before is malformed or was never issued by this server; or both since and before \
					are given""",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(implementation = ProblemDetail.class)))
	FeedPageDto readFeed(
			@Parameter(description = "Page size, 1-" + MAX_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_SIZE) int size,
			@Parameter(description = """
					Opaque cursor from a previous line's own cursor; when given, reads events recorded after it \
					instead of the most recent page. Mutually exclusive with before.""")
			@RequestParam(required = false) @Size(max = MAX_CURSOR_LENGTH) @Nullable String since,
			@Parameter(description = """
					Opaque cursor from a previous line's own cursor; when given, reads events recorded before it \
					instead of the most recent page, for continuing toward older history. Mutually exclusive \
					with since.""")
			@RequestParam(required = false) @Size(max = MAX_CURSOR_LENGTH) @Nullable String before) {
		// Blank, not just absent: an empty since= or before= is treated the
		// same as no cursor at all rather than failing as a malformed one.
		boolean hasSince = since != null && !since.isBlank();
		boolean hasBefore = before != null && !before.isBlank();
		if (hasSince && hasBefore) {
			throw new InvalidFeedCursorException("since and before are mutually exclusive");
		}
		if (hasSince) {
			return FeedPageDto.from(feed.readSince(since, size));
		}
		if (hasBefore) {
			return FeedPageDto.from(feed.readBefore(before, size));
		}
		return FeedPageDto.from(feed.readRecent(size));
	}

}
