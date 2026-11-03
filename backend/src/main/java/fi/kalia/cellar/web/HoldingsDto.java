package fi.kalia.cellar.web;

import fi.kalia.cellar.application.CellarHoldings;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@Schema(description = "What the caller holds of the beers asked about, and the totals of the whole cellar")
public record HoldingsDto(
		@Schema(description = "Beers the caller holds at least one bottle of", requiredMode = Schema.RequiredMode.REQUIRED) long totalBeers,
		@Schema(description = "Bottles the caller holds", requiredMode = Schema.RequiredMode.REQUIRED) long totalBottles,
		@Schema(description = "The asked-about beers the caller holds, one per beer; a beer not held is absent", requiredMode = Schema.RequiredMode.REQUIRED) List<HeldBeerDto> held) {

	static HoldingsDto from(CellarHoldings holdings) {
		return new HoldingsDto(holdings.totals().beers(), holdings.totals().bottles(),
				holdings.held().stream().map(HeldBeerDto::from).toList());
	}

}
