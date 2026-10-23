package fi.kalia.cellar.web;

import fi.kalia.catalog.BeerSummary;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.util.UUID;

// Shared by the owner's and the public entry, so a field added here reaches
// strangers too; an owner-only fact belongs on EntryDto (ADR-0083).
@Schema(description = "The catalog beer a cellar entry is of, as the catalog describes it now")
public record CellarBeerDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID id,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
		@Schema(description = "The brewery's name", requiredMode = Schema.RequiredMode.REQUIRED) String brewery,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String style,
		@Schema(description = "Alcohol by volume, percent", requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal abv) {

	static CellarBeerDto from(BeerSummary beer) {
		return new CellarBeerDto(beer.id(), beer.name(), beer.brewery(), beer.style(), beer.abv());
	}

}
