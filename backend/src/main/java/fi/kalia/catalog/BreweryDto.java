package fi.kalia.catalog;

import java.util.UUID;

public record BreweryDto(UUID id, String name, String country, String city) {
}
