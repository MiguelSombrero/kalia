package fi.kalia.cellar.application;

import fi.kalia.cellar.domain.CellarCounts;
import fi.kalia.cellar.domain.HeldBeer;
import java.util.List;

/** What a user holds of the beers asked about, and of the whole cellar. */
public record CellarHoldings(CellarCounts totals, List<HeldBeer> held) {

}
