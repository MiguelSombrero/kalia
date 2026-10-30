package fi.kalia.cellar.application;

import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;

/** One page of a public cellar's entries, in the order they were added, and what the whole cellar holds that its reader is shown. */
public record PublicCellarPage(List<PublicCellarEntry> entries, long totalEntries, int totalPages, int page,
		long totalBottles, @Nullable Instant lastBottleAddedAt) {

}
