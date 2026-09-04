package fi.kalia.cellar.web;

import fi.kalia.cellar.domain.Entry;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

// Its own type, never EntryDto/BottleDto: a field added to the owner's shape
// must not reach strangers unless someone adds it here too (ADR-0050).
@Schema(description = "A cellar its owner has made public, with its beers and their bottles")
public record PublicCellarDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "The owner's username, as copied from the identity provider") String username,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "One per catalog beer the owner has bottles of") List<PublicCellarEntryDto> entries) {

	static PublicCellarDto of(String username, List<Entry> entries) {
		return new PublicCellarDto(username, entries.stream().map(PublicCellarEntryDto::from).toList());
	}

}
