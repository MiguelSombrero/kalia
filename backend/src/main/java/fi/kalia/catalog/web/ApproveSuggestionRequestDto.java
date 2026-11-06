package fi.kalia.catalog.web;

import fi.kalia.catalog.RejectionReason;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Null;
import org.jspecify.annotations.Nullable;

@Schema(description = "An approval takes no body; one that names a reason is refused, since only a rejection has one")
public record ApproveSuggestionRequestDto(
		@Schema(description = "Must be absent: a reason belongs to a rejection") @Null(message = "must be absent: only a rejection has a reason")
		@Nullable RejectionReason reason) {
}
