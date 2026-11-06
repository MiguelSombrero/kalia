package fi.kalia.notification.domain;

import fi.kalia.catalog.RejectionReason;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.util.Assert;

/**
 * What became of a user's suggestion, frozen when the decision was written and never changed
 * afterwards (ADR-0103). It stores codes and names, never a sentence.
 */
@Entity
@Table(name = "notification", schema = "notification")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Notification {

	public enum Outcome {

		APPROVED,

		REJECTED

	}

	@Id
	@GeneratedValue
	private UUID id;

	private UUID eventId;

	private UUID recipientId;

	@Enumerated(EnumType.STRING)
	private Outcome outcome;

	private boolean edited;

	private UUID beerId;

	private String beerName;

	private @Nullable String suggestedName;

	@Enumerated(EnumType.STRING)
	@Column(name = "reason_code")
	private @Nullable RejectionReason reason;

	private Instant decidedAt;

	private Instant createdAt;

	private Notification(UUID eventId, UUID recipientId, Outcome outcome, boolean edited, UUID beerId,
			String beerName, @Nullable String suggestedName, @Nullable RejectionReason reason, Instant decidedAt,
			Instant createdAt) {
		this.eventId = eventId;
		this.recipientId = recipientId;
		this.outcome = outcome;
		this.edited = edited;
		this.beerId = beerId;
		this.beerName = beerName;
		this.suggestedName = suggestedName;
		this.reason = reason;
		this.decidedAt = decidedAt;
		this.createdAt = createdAt;
	}

	public static Notification reviewed(UUID eventId, UUID recipientId, Outcome outcome, boolean edited, UUID beerId,
			String beerName, @Nullable String suggestedName, @Nullable RejectionReason reason, Instant decidedAt,
			Clock clock) {
		Assert.notNull(eventId, "eventId must not be null");
		Assert.notNull(recipientId, "recipientId must not be null");
		Assert.notNull(outcome, "outcome must not be null");
		Assert.notNull(beerId, "beerId must not be null");
		Assert.hasText(beerName, "beerName must not be blank");
		Assert.notNull(decidedAt, "decidedAt must not be null");
		Assert.isTrue((outcome == Outcome.REJECTED) == (reason != null),
				"a rejection has a reason and an approval has none");
		Assert.isTrue(suggestedName == null || edited, "a suggested name is kept only for an edited approval");
		return new Notification(eventId, recipientId, outcome, edited, beerId, beerName, suggestedName, reason,
				decidedAt, clock.instant());
	}

}
