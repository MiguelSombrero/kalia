package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.ModerationStatus;
import org.jspecify.annotations.Nullable;

/**
 * A suggestion as an admin reads it (ADR-0102): the pending beer, the username of its
 * contributor when they have a profile, and how many of the contributor's beers wait
 * or were rejected.
 */
public record Suggestion(Beer beer, @Nullable String contributorUsername, long contributorPendingCount,
		long contributorRejectedCount) {

	public boolean breweryIsNew() {
		return beer.getBrewery().getModerationStatus() == ModerationStatus.PENDING;
	}

}
