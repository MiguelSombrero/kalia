package fi.kalia.feed.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.Generated;
import org.hibernate.annotations.SourceType;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.generator.EventType;
import org.jspecify.annotations.Nullable;
import org.springframework.util.Assert;

/**
 * A record of one act — currently, one bulk-add of bottles to a cellar entry
 * (ADR-0058). {@code quantity} and {@code brewedDate} are frozen at the
 * moment the underlying {@code cellar.BottleAdded} was recorded and never
 * change again, even if the bottles they describe are later edited or
 * removed.
 */
@Entity
@Table(name = "line", schema = "feed")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class FeedLine {

	@Id
	@GeneratedValue
	private UUID id;

	private UUID eventId;

	private UUID userId;

	private UUID beerId;

	private int quantity;

	private @Nullable LocalDate brewedDate;

	private Instant occurredAt;

	// Populated by the database (feed.line.sequence_number is GENERATED
	// ALWAYS AS IDENTITY): the total order a cursor is read against (ADR-0058).
	@Generated(event = EventType.INSERT)
	@Column(insertable = false, updatable = false)
	private long sequenceNumber;

	@CreationTimestamp(source = SourceType.VM)
	private Instant createdAt;

	@UpdateTimestamp(source = SourceType.VM)
	private Instant updatedAt;

	private FeedLine(UUID eventId, UUID userId, UUID beerId, int quantity, @Nullable LocalDate brewedDate,
			Instant occurredAt) {
		this.eventId = eventId;
		this.userId = userId;
		this.beerId = beerId;
		this.quantity = quantity;
		this.brewedDate = brewedDate;
		this.occurredAt = occurredAt;
	}

	public static FeedLine bottleAdded(UUID eventId, UUID userId, UUID beerId, int quantity,
			@Nullable LocalDate brewedDate, Instant occurredAt) {
		Assert.notNull(eventId, "eventId must not be null");
		Assert.notNull(userId, "userId must not be null");
		Assert.notNull(beerId, "beerId must not be null");
		Assert.isTrue(quantity > 0, "quantity must be positive");
		Assert.notNull(occurredAt, "occurredAt must not be null");
		return new FeedLine(eventId, userId, beerId, quantity, brewedDate, occurredAt);
	}

}
