package fi.kalia.cellar.web;

import fi.kalia.cellar.domain.Bottle;
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

	static PublicCellarBottleDto from(Bottle bottle) {
		return new PublicCellarBottleDto(bottle.getId(), bottle.getEntry().getId(), bottle.getContainerType(),
				bottle.getBrewedDate(), bottle.getBestBeforeDate(), bottle.getCreatedAt(), bottle.getUpdatedAt());
	}

}
