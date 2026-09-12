package fi.kalia.catalog;

import java.util.UUID;

/** A beer's name and brewery, separately, for a caller composing a line about it. */
public record BeerSummary(UUID id, String name, String brewery) {

}
