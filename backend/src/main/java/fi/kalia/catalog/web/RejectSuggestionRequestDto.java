package fi.kalia.catalog.web;

import fi.kalia.catalog.RejectionReason;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Why an admin rejects a suggestion")
public record RejectSuggestionRequestDto(
		@Schema(description = "Why the suggestion is refused, from a fixed list", requiredMode = Schema.RequiredMode.REQUIRED)
		@NotNull RejectionReason reason) {
}
