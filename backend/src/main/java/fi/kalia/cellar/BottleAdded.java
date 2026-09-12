package fi.kalia.cellar;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/**
 * Published once per bulk-add operation — {@code quantity} carries the count,
 * so six identical bottles yield one event, not six (ADR-0053). {@code
 * eventId} is the event's own identity, not a reference to anything in
 * {@code cellar}: it is what a consumer keys idempotent handling on.
 */
public record BottleAdded(UUID eventId, UUID userId, UUID beerId, int quantity,
		@Nullable LocalDate brewedDate, Instant occurredAt) {
}
