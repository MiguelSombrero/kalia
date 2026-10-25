package fi.kalia.cellar.web;

import fi.kalia.cellar.application.PublicCellarEntry;
import fi.kalia.cellar.application.CellarService;
import fi.kalia.cellar.domain.Entry;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Schema(description = "One catalog beer in a public cellar, with the bottles owned of it")
public record PublicCellarEntryDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) CellarBeerDto beer,
		@Schema(description = "Derived by counting bottles, never stored; may exceed the bottles listed",
				requiredMode = Schema.RequiredMode.REQUIRED) long quantity,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt,
		@Schema(description = "The oldest bottles of the beer, at most " + CellarService.MAX_PUBLIC_BOTTLES_PER_ENTRY,
				requiredMode = Schema.RequiredMode.REQUIRED) List<PublicCellarBottleDto> bottles) {

	static PublicCellarEntryDto from(PublicCellarEntry view) {
		Entry entry = view.entry();
		return new PublicCellarEntryDto(entry.getId(), CellarBeerDto.from(view.beer()), view.bottleCount(),
				entry.getCreatedAt(), entry.getUpdatedAt(),
				view.bottles().stream().map(PublicCellarBottleDto::from).toList());
	}

}
