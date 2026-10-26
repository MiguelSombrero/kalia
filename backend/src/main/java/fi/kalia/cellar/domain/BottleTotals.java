package fi.kalia.cellar.domain;

import java.time.Instant;
import org.jspecify.annotations.Nullable;

/** Every bottle one user holds, and when the newest was added (null when there are none). */
public record BottleTotals(long count, @Nullable Instant lastAddedAt) {

}
