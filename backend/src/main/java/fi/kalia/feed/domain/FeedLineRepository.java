package fi.kalia.feed.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FeedLineRepository extends JpaRepository<FeedLine, UUID> {

	boolean existsByEventId(UUID eventId);

	// sequenceNumber, not occurredAt, is the total order a page is read
	// against — a timestamp alone does not survive commit reordering (ADR-0058).
	List<FeedLine> findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(Instant cutoff, Pageable pageable);

}
