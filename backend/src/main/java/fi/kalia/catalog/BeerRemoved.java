package fi.kalia.catalog;

import java.time.Instant;
import java.util.UUID;

/**
 * Published once when an admin takes an approved beer down (ADR-0102). Nothing consumes it yet,
 * and it names no contributor, since an imported beer has none.
 */
public record BeerRemoved(UUID eventId, UUID beerId, Instant occurredAt) {

}
