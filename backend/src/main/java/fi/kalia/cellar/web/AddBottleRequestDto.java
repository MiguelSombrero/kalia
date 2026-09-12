package fi.kalia.cellar.web;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import fi.kalia.cellar.domain.ContainerType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

// No id field: bottle ids are always server-assigned; ignoreUnknown means a
// client sending one anyway is ignored, not rejected.
@JsonIgnoreProperties(ignoreUnknown = true)
@Schema(description = "One or more identical bottles to add to the caller's cellar")
public record AddBottleRequestDto(
		@Schema(description = "The catalog beer this bottle is of", requiredMode = Schema.RequiredMode.REQUIRED) @NotNull UUID beerId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) @NotNull ContainerType containerType,
		@Schema(description = "Null when not recorded") @Nullable LocalDate brewedDate,
		@Schema(description = "Null when not recorded") @Nullable LocalDate bestBeforeDate,
		@Schema(description = "How many identical bottles to add (1-" + MAX_QUANTITY
				+ "); absent means one") @Nullable @Min(MIN_QUANTITY) @Max(MAX_QUANTITY) Integer quantity) {

	private static final int MIN_QUANTITY = 1;

	// A case of beer. Adding more than that of one beer, sharing a single set
	// of dates, is far likelier a typo than a real cellar.
	private static final int MAX_QUANTITY = 24;

	private static final int DEFAULT_QUANTITY = 1;

	int quantityOrDefault() {
		return quantity == null ? DEFAULT_QUANTITY : quantity;
	}

}
