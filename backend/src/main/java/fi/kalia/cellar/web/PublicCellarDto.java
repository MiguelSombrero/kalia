package fi.kalia.cellar.web;

import fi.kalia.cellar.application.PublicCellarPage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;

// Its own type, never EntryDto/BottleDto: a field added to the owner's shape
// must not reach strangers unless someone adds it here too (ADR-0050).
@Schema(description = "One page of a cellar its owner has made public, with its beers and their bottles")
public record PublicCellarDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "This page's beers, in the order they were added to the cellar") List<PublicCellarEntryDto> content,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Beers in the whole cellar that the reader is shown") long totalElements,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Pages those beers span at this page size") int totalPages,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Zero-based index of this page") int page,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "The owner's username, as copied from the identity provider") String username,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Bottles in the beers the reader is shown") long totalBottles,
		@Schema(description = "When the newest of those bottles was added; absent for a cellar with none") @Nullable Instant lastBottleAddedAt) {

	static PublicCellarDto of(String username, PublicCellarPage page) {
		return new PublicCellarDto(page.entries().stream().map(PublicCellarEntryDto::from).toList(),
				page.totalEntries(), page.totalPages(), page.page(), username, page.totalBottles(),
				page.lastBottleAddedAt());
	}

}
