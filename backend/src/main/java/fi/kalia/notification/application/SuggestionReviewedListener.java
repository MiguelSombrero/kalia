package fi.kalia.notification.application;

import fi.kalia.catalog.SuggestionReviewed;
import lombok.RequiredArgsConstructor;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class SuggestionReviewedListener {

	private final NotificationService notifications;

	// Async and after commit: a failure here cannot undo the admin's decision (ADR-0058).
	@ApplicationModuleListener
	void on(SuggestionReviewed event) {
		notifications.recordReviewed(event);
	}

}
