package fi.kalia.cellar.domain;

import java.util.UUID;

/** How many bottles one entry holds. */
public record BottleCount(UUID entryId, long count) {

}
