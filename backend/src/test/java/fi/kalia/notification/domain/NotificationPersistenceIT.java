package fi.kalia.notification.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.RejectionReason;
import fi.kalia.notification.domain.Notification.Outcome;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class NotificationPersistenceIT {

	private static final Instant DECIDED_AT = Instant.parse("2026-11-05T10:00:00Z");

	@Autowired
	private NotificationRepository notifications;

	// Account deletion deletes by recipient (ADR-0104); the deletion itself is not built yet.
	@Test
	void deletingByRecipientRemovesEveryNotificationOfThatRecipientAndNoOneElses() {
		UUID leaving = UUID.randomUUID();
		UUID staying = UUID.randomUUID();
		approval(leaving);
		approval(leaving);
		Notification kept = approval(staying);

		long deleted = notifications.deleteByRecipientId(leaving);

		assertThat(deleted).isEqualTo(2);
		assertThat(notifications.countByRecipientId(leaving)).isZero();
		assertThat(notifications.findById(kept.getId())).isPresent();
	}

	@Test
	void aSecondRowForOneEventIsRefusedByTheDatabase() {
		UUID eventId = UUID.randomUUID();
		notifications.saveAndFlush(approval(eventId, UUID.randomUUID()));

		assertThatThrownBy(() -> notifications.saveAndFlush(approval(eventId, UUID.randomUUID())))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void aRejectionKeepsItsReasonAndAnEditedApprovalBothNames() {
		Notification rejection = notifications.saveAndFlush(Notification.reviewed(UUID.randomUUID(),
				UUID.randomUUID(), Outcome.REJECTED, false, UUID.randomUUID(), "Name", null,
				RejectionReason.ALREADY_IN_CATALOG, DECIDED_AT, Clock.systemUTC()));
		Notification edited = notifications.saveAndFlush(Notification.reviewed(UUID.randomUUID(),
				UUID.randomUUID(), Outcome.APPROVED, true, UUID.randomUUID(), "Decided", "Suggested", null,
				DECIDED_AT, Clock.systemUTC()));

		assertThat(notifications.findById(rejection.getId()).orElseThrow().getReason())
				.isEqualTo(RejectionReason.ALREADY_IN_CATALOG);
		Notification reread = notifications.findById(edited.getId()).orElseThrow();
		assertThat(reread.getBeerName()).isEqualTo("Decided");
		assertThat(reread.getSuggestedName()).isEqualTo("Suggested");
		assertThat(reread.isEdited()).isTrue();
		assertThat(reread.getDecidedAt()).isEqualTo(DECIDED_AT);
	}

	@Test
	void aRejectionWithoutAReasonIsRefused() {
		assertThatThrownBy(() -> Notification.reviewed(UUID.randomUUID(), UUID.randomUUID(), Outcome.REJECTED, false,
				UUID.randomUUID(), "Name", null, null, DECIDED_AT, Clock.systemUTC()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void aSuggestedNameWithoutAnEditIsRefused() {
		assertThatThrownBy(() -> Notification.reviewed(UUID.randomUUID(), UUID.randomUUID(), Outcome.APPROVED, false,
				UUID.randomUUID(), "Name", "Other", null, DECIDED_AT, Clock.systemUTC()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	private Notification approval(UUID recipient) {
		return notifications.save(approval(UUID.randomUUID(), recipient));
	}

	private static Notification approval(UUID eventId, UUID recipient) {
		return Notification.reviewed(eventId, recipient, Outcome.APPROVED, false, UUID.randomUUID(), "Name", null,
				null, DECIDED_AT, Clock.systemUTC());
	}

}
