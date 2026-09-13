package fi.kalia.feed.application;

import java.time.Instant;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

/** One feed line, fully resolved: whose act it was and which beer, by name. */
public record FeedLineView(String username, String beerName, String brewery, int quantity,
		@Nullable LocalDate brewedDate, Instant occurredAt) {

}
