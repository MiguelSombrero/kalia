package fi.kalia.cellar.domain;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

/** One bottle as a public cellar lists it, read without loading its entry. */
public record BottleListing(UUID id, UUID entryId, ContainerType containerType, @Nullable LocalDate brewedDate,
		@Nullable LocalDate bestBeforeDate, Instant createdAt, Instant updatedAt) {

}
