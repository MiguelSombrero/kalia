package fi.kalia.cellar.web;

import fi.kalia.cellar.domain.Entry;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Schema(description = "One catalog beer in a public cellar, with the bottles owned of it")
public record PublicCellarEntryDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID beerId,
		@Schema(description = "Derived by counting bottles, never stored",
				requiredMode = Schema.RequiredMode.REQUIRED) long quantity,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<PublicCellarBottleDto> bottles) {

	static PublicCellarEntryDto from(Entry entry) {
		List<PublicCellarBottleDto> bottles = entry.getBottles().stream().map(PublicCellarBottleDto::from).toList();
		return new PublicCellarEntryDto(entry.getId(), entry.getBeerId(), bottles.size(),
				entry.getCreatedAt(), entry.getUpdatedAt(), bottles);
	}

}
