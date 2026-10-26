package fi.kalia.cellar.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.cellar.domain.BottleListing;
import fi.kalia.cellar.domain.Entry;
import java.util.List;

/**
 * One entry of a public cellar joined with its beer: the bottles shown (at most
 * {@link CellarService#MAX_PUBLIC_BOTTLES_PER_ENTRY}, oldest first) and how many are held.
 */
public record PublicCellarEntry(Entry entry, BeerSummary beer, long bottleCount, List<BottleListing> bottles) {

}
