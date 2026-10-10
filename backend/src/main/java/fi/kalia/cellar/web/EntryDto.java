package fi.kalia.cellar.web;

import fi.kalia.cellar.domain.Entry;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Schema(description = "A cellar entry: one catalog beer the caller owns bottles of")
public record EntryDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID beerId,
		@Schema(description = "Derived by counting bottles, never stored", requiredMode = Schema.RequiredMode.REQUIRED) long quantity,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<BottleDto> bottles) {

	static EntryDto from(Entry entry) {
		List<BottleDto> bottles = entry.getBottles().stream().map(BottleDto::from).toList();
		return new EntryDto(entry.getId(), entry.getBeerId(), bottles.size(), entry.getCreatedAt(),
				entry.getUpdatedAt(), bottles);
	}

}
