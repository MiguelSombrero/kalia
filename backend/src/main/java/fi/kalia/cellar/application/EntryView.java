package fi.kalia.cellar.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.cellar.domain.Entry;

/** One cellar entry joined with its beer, as the catalog describes it now. */
public record EntryView(Entry entry, BeerSummary beer) {

}
