package fi.kalia.catalog;

import java.util.UUID;
import org.jspecify.annotations.Nullable;

public record BreweryDto(UUID id, String name, String country, @Nullable String city) {
}
