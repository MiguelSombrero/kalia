package fi.kalia.feed.application;

import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FeedService {

	private final FeedLineRepository lines;

	public void recordBottleAdded(UUID eventId, UUID userId, UUID beerId, int quantity,
			@Nullable LocalDate brewedDate, Instant occurredAt) {
		// Do not remove: the event publication registry is at-least-once, so
		// this may run twice for one BottleAdded (ADR-0058). eventId is the
		// idempotency key.
		if (lines.existsByEventId(eventId)) {
			return;
		}
		lines.save(FeedLine.bottleAdded(eventId, userId, beerId, quantity, brewedDate, occurredAt));
	}

}
