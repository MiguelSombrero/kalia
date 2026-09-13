package fi.kalia.feed.domain;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedLineRepository extends JpaRepository<FeedLine, UUID> {

	boolean existsByEventId(UUID eventId);

	// sequenceNumber, not occurredAt, is the total order a page is read
	// against — a timestamp alone does not survive commit reordering (ADR-0058).
	List<FeedLine> findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(Instant cutoff, Pageable pageable);

	// A verified "since" cursor is resolved against this to find the anchor's
	// occurredAt for the window check; empty means aged past retention, not
	// forged — forgery is already ruled out by the cursor's own signature.
	Optional<FeedLine> findBySequenceNumber(long sequenceNumber);

	// Ascending, unlike the page above: an increment must cover every row
	// contiguously from the cursor forward, never skip ahead to the newest
	// rows first, or a truncated batch would leave a gap no later request
	// closes.
	List<FeedLine> findBySequenceNumberGreaterThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberAsc(
			long sequenceNumber, Instant cutoff, Pageable pageable);

}
