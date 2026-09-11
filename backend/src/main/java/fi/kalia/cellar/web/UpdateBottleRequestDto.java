package fi.kalia.cellar.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import fi.kalia.cellar.domain.ContainerType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/** No {@code id} field: bottle ids are server-assigned and never change. */
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "A bottle's new details, replacing all of them")
public record UpdateBottleRequestDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull ContainerType containerType,
		@Schema(description = "Null when not recorded") @Nullable LocalDate brewedDate,
		@Schema(description = "Null when not recorded") @Nullable LocalDate bestBeforeDate,
		@Schema(description = "The caller's local calendar date, judged against brewedDate instead of the "
				+ "server's own clock; absent falls back to the server's UTC date") @Nullable LocalDate today) {
}
