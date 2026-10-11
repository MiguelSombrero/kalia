package fi.kalia.feed.application;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** One feed line, fully resolved: whose act it was and which beer, as the catalog describes it now. */
public record FeedLineView(String cursor, String username, UUID beerId, String beerName, String brewery, String style,
		BigDecimal abv, int quantity, @Nullable LocalDate brewedDate, Instant occurredAt) {

}
