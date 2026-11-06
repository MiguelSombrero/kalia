package fi.kalia.notification.web;

import fi.kalia.identity.IdentityApi;
import fi.kalia.notification.application.InvalidPageException;
import fi.kalia.notification.application.NotificationService;
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
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "What became of the signed-in caller's suggestions, until they acknowledge it")
@SecurityRequirement(name = "oauth2")
@ApiResponse(responseCode = "401", description = "Missing or invalid bearer token",
		content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
				schema = @Schema(implementation = Problem.class)))
class NotificationController {

	/** A page holds at most this many notifications, so no response returns an unbounded slice of the table. */
	static final int MAX_PAGE_SIZE = 100;

	/** Rows a page may skip (page × size); a user's decided suggestions are far fewer, so a deeper page is a mistake. */
	static final int MAX_OFFSET = 10_000;

	private final NotificationService notifications;

	private final IdentityApi identity;

	@GetMapping
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "List the caller's notifications", description = """
			The caller's own notifications, the most recently decided first. Opening the list \
			acknowledges nothing: a notification stays until it is acknowledged. A page skipping more \
			than """ + MAX_OFFSET + """
			\srows (page × size) is refused with 400 problem+json.""")
	@ApiResponse(responseCode = "400", description = "A page parameter is out of range, or the page skips more rows than allowed",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(oneOf = {ValidationProblem.class, Problem.class})))
	NotificationPageDto listNotifications(
			@Parameter(description = "Zero-based page index; page × size is at most " + MAX_OFFSET)
			@RequestParam(defaultValue = "0") @Min(0) @Max(MAX_OFFSET) int page,
			@Parameter(description = "Page size, 1-" + MAX_PAGE_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
		requireBoundedOffset(page, size);
		return NotificationPageDto.from(
				notifications.list(identity.requireCurrentUserId(), PageRequest.of(page, size)).map(NotificationDto::from));
	}

	@GetMapping("/unread-count")
	@ResponseStatus(HttpStatus.OK)
	@Operation(summary = "Count the caller's unacknowledged notifications", description = """
			How many notifications the caller has not acknowledged, without returning them: the read \
			a signed-in page makes to show that there is something to open.""")
	UnreadCountDto unreadCount() {
		return new UnreadCountDto(notifications.unreadCount(identity.requireCurrentUserId()));
	}

	@DeleteMapping("/{id}")
	@ResponseStatus(HttpStatus.NO_CONTENT)
	@Operation(summary = "Acknowledge a notification", description = """
			Deletes the notification: acknowledging it is final. 404 when it does not exist, was \
			acknowledged already, or is someone else's, which the response does not tell apart.""")
	@ApiResponses({
			@ApiResponse(responseCode = "400", description = "The id is not a notification id",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "404",
					description = "The notification does not exist, was acknowledged already, or belongs to someone else",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class)))})
	void acknowledge(@Parameter(description = "Notification id") @PathVariable UUID id) {
		notifications.acknowledge(identity.requireCurrentUserId(), id);
	}

	private static void requireBoundedOffset(int page, int size) {
		if ((long) page * size > MAX_OFFSET) {
			throw new InvalidPageException("page (%d) × size (%d) must not skip more than %d rows"
					.formatted(page, size, MAX_OFFSET));
		}
	}

}
