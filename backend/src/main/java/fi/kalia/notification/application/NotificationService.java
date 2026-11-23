package fi.kalia.notification.application;

import fi.kalia.catalog.SuggestionReviewed;
import fi.kalia.notification.domain.Notification;
import fi.kalia.notification.domain.NotificationRepository;
import java.time.Clock;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class NotificationService {

	private final NotificationRepository notifications;

	private final Clock clock;

	void recordReviewed(SuggestionReviewed event) {
		recordReviewed(event, event.reason() == null ? null : event.reason().name());
	}

	// The reason crosses as its name, the way the outcome does: whatever catalog publishes is stored
	// as it came, so a reason this module has not caught up with cannot fail the write.
	void recordReviewed(SuggestionReviewed event, @Nullable String reason) {
		// Do not remove: a publication not marked complete is resubmitted (ADR-0081), so this may
		// run twice for one event. eventId is the idempotency key (ADR-0058).
		if (notifications.existsByEventId(event.eventId())) {
			return;
		}
		notifications.save(Notification.reviewed(event.eventId(), event.contributorId(),
				Notification.Outcome.valueOf(event.outcome().name()), event.edited(), event.beerId(),
				event.beerName(), event.suggestedName(), reason, event.occurredAt(), clock));
	}

	@Transactional(readOnly = true)
	public Page<Notification> list(UUID recipientId, Pageable pageable) {
		return notifications.findByRecipientIdOrderByDecidedAtDescIdDesc(recipientId, pageable);
	}

	@Transactional(readOnly = true)
	public long unreadCount(UUID recipientId) {
		return notifications.countByRecipientId(recipientId);
	}

	public void acknowledge(UUID recipientId, UUID id) {
		if (notifications.deleteByIdAndRecipientId(id, recipientId) == 0) {
			throw new NotificationNotFoundException();
		}
	}

}
