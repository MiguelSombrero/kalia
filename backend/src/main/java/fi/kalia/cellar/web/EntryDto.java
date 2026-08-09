package fi.kalia.cellar.web;

import fi.kalia.cellar.domain.EntrySummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.UUID;

@Schema(description = "A cellar entry: one catalog beer the caller owns bottles of")
public record EntryDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID beerId,
		@Schema(description = "Derived by counting bottles, never stored", requiredMode = Schema.RequiredMode.REQUIRED) long quantity,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt) {

	static EntryDto from(EntrySummary summary) {
		return new EntryDto(summary.getId(), summary.getBeerId(), summary.getQuantity(),
				summary.getCreatedAt(), summary.getUpdatedAt());
	}

}
