package fi.kalia.notification.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.SuggestionReviewed;
import fi.kalia.catalog.SuggestionReviewed.Outcome;
import fi.kalia.notification.domain.Notification;
import fi.kalia.notification.domain.NotificationRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.modulith.test.Scenario;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * The listener on the event a review decision publishes (ADR-0103): each scenario publishes
 * {@code SuggestionReviewed} itself and polls the repository for what the listener wrote.
 */
@ApplicationModuleTest(mode = BootstrapMode.DIRECT_DEPENDENCIES)
@Import(TestcontainersConfiguration.class)
class SuggestionReviewedListenerModuleIT {

	private static final Instant DECIDED_AT = Instant.parse("2026-11-05T10:00:00Z");

	@Autowired
	private NotificationRepository notifications;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private ApplicationEventPublisher publisher;

	@Autowired
	private PlatformTransactionManager transactionManager;

	@Test
	void anApprovalWritesOneNotificationFreezingWhatWasDecided(Scenario scenario) {
		SuggestionReviewed event = approval(UUID.randomUUID(), "Plain Approval");

		Notification written = publishAndAwait(scenario, event);

		assertThat(written.getRecipientId()).isEqualTo(event.contributorId());
		assertThat(written.getOutcome()).isEqualTo(Notification.Outcome.APPROVED);
		assertThat(written.isEdited()).isFalse();
		assertThat(written.getBeerId()).isEqualTo(event.beerId());
		assertThat(written.getBeerName()).isEqualTo("Plain Approval");
		assertThat(written.getSuggestedName()).isNull();
		assertThat(written.getReason()).isNull();
		assertThat(written.getDecidedAt()).isEqualTo(DECIDED_AT);
	}

	@Test
	void aRejectionWritesOneNotificationKeepingTheReasonCode(Scenario scenario) {
		SuggestionReviewed event = new SuggestionReviewed(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
				Outcome.REJECTED, "Rejected Name", false, null, RejectionReason.NOT_A_REAL_BEER, DECIDED_AT);

		Notification written = publishAndAwait(scenario, event);

		assertThat(written.getOutcome()).isEqualTo(Notification.Outcome.REJECTED);
		assertThat(written.getReason()).isEqualTo(RejectionReason.NOT_A_REAL_BEER);
		assertThat(written.isEdited()).isFalse();
		assertThat(written.getBeerName()).isEqualTo("Rejected Name");
	}

	@Test
	void anEditedApprovalKeepsBothNames(Scenario scenario) {
		SuggestionReviewed event = new SuggestionReviewed(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
				Outcome.APPROVED, "Name As Decided", true, "name as suggested", null, DECIDED_AT);

		Notification written = publishAndAwait(scenario, event);

		assertThat(written.getOutcome()).isEqualTo(Notification.Outcome.APPROVED);
		assertThat(written.isEdited()).isTrue();
		assertThat(written.getBeerName()).isEqualTo("Name As Decided");
		assertThat(written.getSuggestedName()).isEqualTo("name as suggested");
	}

	// An edit of the style or ABV leaves the name as it was; the event says edited all the same
	// and the notification must too, however it fills suggestedName.
	@Test
	void editedIsKeptAsTheEventSaysItNotDerivedFromTheNames(Scenario scenario) {
		SuggestionReviewed event = new SuggestionReviewed(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
				Outcome.APPROVED, "Same Name", true, null, null, DECIDED_AT);

		Notification written = publishAndAwait(scenario, event);

		assertThat(written.isEdited()).isTrue();
		assertThat(written.getSuggestedName()).isNull();
	}

	// The event does not say who decided, so a contributor who is also the deciding admin is
	// written for like any other (ADR-0103): the end-to-end case is SuggestionDecisionNotificationIT.
	@Test
	void aDecisionIsWrittenForTheContributorWhoeverDecidedIt(Scenario scenario) {
		UUID adminWhoIsAlsoTheContributor = UUID.randomUUID();

		Notification written = publishAndAwait(scenario, approval(adminWhoIsAlsoTheContributor, "Own Suggestion"));

		assertThat(written.getRecipientId()).isEqualTo(adminWhoIsAlsoTheContributor);
	}

	@Test
	void aRedeliveredEventWritesNothingMore(Scenario scenario) {
		SuggestionReviewed event = approval(UUID.randomUUID(), "Delivered Twice");
		publishAndAwait(scenario, event);

		publishInTransaction(event);
		// A completed publication is deleted from the registry (ADR-0081): once the second one is
		// gone, its listener has finished, so a row it wrote would be there to count.
		await().atMost(Duration.ofSeconds(10)).until(() -> registryRows(event.eventId()) == 0);

		assertThat(notificationsOf(event.eventId())).hasSize(1);
	}

	@Test
	void aLaterEventOfTheSameBeerWritesItsOwnNotification(Scenario scenario) {
		UUID contributor = UUID.randomUUID();
		UUID beer = UUID.randomUUID();
		SuggestionReviewed first = new SuggestionReviewed(UUID.randomUUID(), contributor, beer, Outcome.REJECTED,
				"Again", false, null, RejectionReason.INCORRECT_DETAILS, DECIDED_AT);
		SuggestionReviewed second = new SuggestionReviewed(UUID.randomUUID(), contributor, beer, Outcome.APPROVED,
				"Again", false, null, null, DECIDED_AT.plusSeconds(60));

		publishAndAwait(scenario, first);
		publishAndAwait(scenario, second);

		assertThat(notifications.findAll()).filteredOn(n -> n.getBeerId().equals(beer)).hasSize(2);
	}

	// A removal publishes its own event and notifies nobody (ADR-0102). That event is not in the
	// code yet, so a record of its shape stands in. Once a later decision's row exists, the removal
	// has had every chance to be handled.
	@Test
	void aBeerRemovedEventWritesNothing(Scenario scenario) {
		UUID removedBeer = UUID.randomUUID();
		publishInTransaction(new BeerRemoved(UUID.randomUUID(), removedBeer, DECIDED_AT));
		SuggestionReviewed sentinel = approval(UUID.randomUUID(), "Sentinel");

		publishAndAwait(scenario, sentinel);

		assertThat(notifications.findAll()).noneMatch(n -> n.getBeerId().equals(removedBeer));
	}

	private Notification publishAndAwait(Scenario scenario, SuggestionReviewed event) {
		scenario.publish(event).andWaitForStateChange(() -> notificationsOf(event.eventId()),
				written -> !written.isEmpty());
		return notificationsOf(event.eventId()).getFirst();
	}

	private List<Notification> notificationsOf(UUID eventId) {
		return notifications.findAll().stream().filter(n -> n.getEventId().equals(eventId)).toList();
	}

	private void publishInTransaction(Object event) {
		new TransactionTemplate(transactionManager).executeWithoutResult(status -> publisher.publishEvent(event));
	}

	private Integer registryRows(UUID eventId) {
		return jdbc.queryForObject("SELECT count(*) FROM event_publication WHERE serialized_event LIKE ?",
				Integer.class, "%" + eventId + "%");
	}

	private static SuggestionReviewed approval(UUID contributor, String name) {
		return new SuggestionReviewed(UUID.randomUUID(), contributor, UUID.randomUUID(), Outcome.APPROVED, name,
				false, null, null, DECIDED_AT);
	}

	private record BeerRemoved(UUID eventId, UUID beerId, Instant occurredAt) {

	}

}
