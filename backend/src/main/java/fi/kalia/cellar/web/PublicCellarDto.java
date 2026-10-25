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
				description = "The owner's username, as copied from the identity provider") String username,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "This page's beers, in the order they were added to the cellar") List<PublicCellarEntryDto> entries,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Zero-based index of this page") int page,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Pages the cellar spans at this page size") int totalPages,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Beers in the whole cellar") long totalBeers,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED,
				description = "Bottles in the whole cellar") long totalBottles,
		@Schema(description = "When the newest bottle was added; absent for a cellar with none") @Nullable Instant lastBottleAddedAt) {

	static PublicCellarDto of(String username, PublicCellarPage page) {
		return new PublicCellarDto(username, page.entries().stream().map(PublicCellarEntryDto::from).toList(),
				page.page(), page.totalPages(), page.totalEntries(), page.totalBottles(), page.lastBottleAddedAt());
	}

}
