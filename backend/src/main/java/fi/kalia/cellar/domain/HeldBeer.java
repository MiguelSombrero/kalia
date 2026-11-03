package fi.kalia.cellar.domain;

import java.util.UUID;

/** How many bottles of one beer a user holds. */
public record HeldBeer(UUID beerId, long quantity) {

}
