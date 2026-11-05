package fi.kalia.catalog.web;

import io.swagger.v3.oas.annotations.media.Schema;
import org.jspecify.annotations.Nullable;

@Schema(description = "Who suggested a beer, as only an admin sees them")
public record SuggestionContributorDto(
		@Schema(description = "Absent when the contributor has no profile row, which is created on a user's first request")
		@Nullable String username,
		@Schema(description = "How many of the contributor's suggestions are waiting for review, this one included",
				requiredMode = Schema.RequiredMode.REQUIRED) long pendingCount,
		@Schema(description = "How many of the contributor's suggestions were rejected",
				requiredMode = Schema.RequiredMode.REQUIRED) long rejectedCount) {
}
