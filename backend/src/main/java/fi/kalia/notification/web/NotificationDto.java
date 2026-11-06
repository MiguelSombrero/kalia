package fi.kalia.notification.web;

import fi.kalia.catalog.RejectionReason;
import fi.kalia.notification.domain.Notification;
import fi.kalia.notification.domain.Notification.Outcome;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = """
		What became of a suggestion, as it was when decided. Codes and names only: the client writes \
		the sentence in the reader's language.""")
record NotificationDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "Whether the suggestion was approved or rejected")
		Outcome outcome,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Whether an admin changed the suggestion before approving it; an edit of anything but the name leaves suggestedName absent")
		boolean edited,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The suggested beer's id; its page answers 404 once rejected")
		UUID beerId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED, description = "The beer's name as decided")
		String beerName,
		@Schema(description = "The name as suggested, present only when the admin changed it") @Nullable String suggestedName,
		@Schema(description = "Why it was rejected, present only on a rejection") @Nullable RejectionReason reason,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant decidedAt) {

	static NotificationDto from(Notification notification) {
		return new NotificationDto(notification.getId(), notification.getOutcome(), notification.isEdited(),
				notification.getBeerId(), notification.getBeerName(), notification.getSuggestedName(),
				notification.getReason(), notification.getDecidedAt());
	}

}
