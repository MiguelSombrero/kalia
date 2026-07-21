package fi.kalia.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.UUID;

@Schema(description = "Brief reference to a brewery, as embedded in a beer summary")
public record BreweryRefDto(UUID id, String name) {
}
