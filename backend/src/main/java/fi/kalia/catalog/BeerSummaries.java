package fi.kalia.catalog;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * {@code withheld} are the ids of beers that exist but that the viewer may not be shown yet, so a
 * caller can tell them from an id that matches no beer at all.
 */
public record BeerSummaries(Map<UUID, BeerSummary> found, Set<UUID> withheld) {

}
