package fi.kalia.profile.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

// No id field: the caller is always the bearer token's subject, never a
// request value. ignoreUnknown means a client sending one anyway is
// ignored, not rejected (mirrors AddBottleRequestDto).
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "The caller's desired cellar visibility")
public record ChangeVisibilityRequestDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Whether the caller's cellar should be readable by anyone with the link") @NotNull Boolean cellarPublic) {
}
