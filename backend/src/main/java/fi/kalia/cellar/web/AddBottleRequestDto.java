package fi.kalia.cellar.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import fi.kalia.cellar.domain.ContainerType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

// No id field: bottle ids are always server-assigned; ignoreUnknown means a
// client sending one anyway is ignored, not rejected.
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "A bottle to add to the caller's cellar")
public record AddBottleRequestDto(
		@Schema(description = "The catalog beer this bottle is of", requiredMode = Schema.RequiredMode.REQUIRED) @NotNull UUID beerId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull ContainerType containerType,
		@Schema(description = "Null when not recorded") @Nullable LocalDate brewedDate,
		@Schema(description = "Null when not recorded") @Nullable LocalDate bestBeforeDate) {
}
