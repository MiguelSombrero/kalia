package fi.kalia.cellar.web;

import fi.kalia.cellar.domain.HeldBeer;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "A beer the caller holds bottles of")
public record HeldBeerDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID beerId,
		@Schema(description = "Bottles of this beer the caller holds", requiredMode = Schema.RequiredMode.REQUIRED) long quantity) {

	static HeldBeerDto from(HeldBeer held) {
		return new HeldBeerDto(held.beerId(), held.quantity());
	}

}
