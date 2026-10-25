package fi.kalia.cellar.web;

import fi.kalia.cellar.domain.BottleListing;
import fi.kalia.cellar.domain.ContainerType;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "A single bottle in a public cellar")
public record PublicCellarBottleDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID entryId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) ContainerType containerType,
		@Schema(description = "Null when not recorded") @Nullable LocalDate brewedDate,
		@Schema(description = "Null when not recorded") @Nullable LocalDate bestBeforeDate,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant createdAt,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant updatedAt) {

	static PublicCellarBottleDto from(BottleListing bottle) {
		return new PublicCellarBottleDto(bottle.id(), bottle.entryId(), bottle.containerType(),
				bottle.brewedDate(), bottle.bestBeforeDate(), bottle.createdAt(), bottle.updatedAt());
	}

}
