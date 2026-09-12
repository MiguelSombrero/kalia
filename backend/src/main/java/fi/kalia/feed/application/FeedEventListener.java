package fi.kalia.feed.application;

import fi.kalia.cellar.BottleAdded;
import lombok.RequiredArgsConstructor;
import org.springframework.modulith.events.ApplicationModuleListener;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
class FeedEventListener {

	private final FeedService feed;

	// Async + after-commit (ApplicationModuleListener, not @EventListener):
	// a failure here cannot fail or roll back the cellar write that raised
	// the event (ADR-0058).
	@ApplicationModuleListener
	void on(BottleAdded event) {
		feed.recordBottleAdded(event.eventId(), event.userId(), event.beerId(), event.quantity(),
				event.brewedDate(), event.occurredAt());
	}

}
