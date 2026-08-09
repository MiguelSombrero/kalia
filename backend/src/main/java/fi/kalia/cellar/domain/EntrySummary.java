package fi.kalia.cellar.domain;

import java.time.Instant;
import java.util.UUID;

/**
 * One entry with its derived quantity, for a read model that must not load
 * every bottle just to count them (architecture.md §3, §4).
 */
public interface EntrySummary {

	UUID getId();

	UUID getBeerId();

	long getQuantity();

	Instant getCreatedAt();

	Instant getUpdatedAt();

}
