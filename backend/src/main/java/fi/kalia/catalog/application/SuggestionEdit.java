package fi.kalia.catalog.application;

import java.math.BigDecimal;

public record SuggestionEdit(String name, String style, BigDecimal abv, BreweryChoice breweryChoice) {
}
