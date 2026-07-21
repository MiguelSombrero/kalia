package fi.kalia.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "A brewery")
public record BreweryDto(UUID id, String name, String country, @Nullable String city) {
}
