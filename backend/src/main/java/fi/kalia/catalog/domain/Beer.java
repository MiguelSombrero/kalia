package fi.kalia.catalog.domain;

import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.SuggestionReviewed;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.AbstractAggregateRoot;
import org.springframework.util.Assert;

@Entity
@Table(name = "beer", schema = "catalog")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Beer extends AbstractAggregateRoot<Beer> {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "brewery_id")
	private Brewery brewery;

	private String name;

	private String style;

	private BigDecimal abv;

	private @Nullable UUID contributorId;

	@Enumerated(EnumType.STRING)
	private ModerationStatus moderationStatus;

	private Instant createdAt;

	private Beer(Brewery brewery, String name, String style, BigDecimal abv,
			@Nullable UUID contributorId, Instant createdAt) {
		this.brewery = brewery;
		this.name = name;
		this.style = style;
		this.abv = abv;
		this.contributorId = contributorId;
		this.moderationStatus = ModerationStatus.APPROVED;
		this.createdAt = createdAt;
	}

	public static Beer create(Brewery brewery, String name, String style,
			BigDecimal abv, Clock clock) {
		Assert.notNull(brewery, "brewery must not be null");
		Assert.hasText(name, "name must not be blank");
		Assert.hasText(style, "style must not be blank");
		Assert.notNull(abv, "abv must not be null");
		Assert.isTrue(abv.signum() >= 0, "abv must not be negative");
		return new Beer(brewery, name, style, abv, null, clock.instant());
	}

	public static Beer addedBy(UUID contributorId, Brewery brewery, String name, String style,
			BigDecimal abv, Clock clock) {
		Assert.notNull(contributorId, "contributorId must not be null");
		Beer beer = create(brewery, name.strip(), style, abv, clock);
		beer.contributorId = contributorId;
		beer.moderationStatus = ModerationStatus.PENDING;
		return beer;
	}

	public boolean isSuggestion() {
		return contributorId != null && moderationStatus == ModerationStatus.PENDING;
	}

	public Instant approve(Clock clock) {
		requireSuggestion();
		Instant decidedAt = clock.instant();
		moderationStatus = ModerationStatus.APPROVED;
		registerEvent(reviewed(SuggestionReviewed.Outcome.APPROVED, null, decidedAt));
		return decidedAt;
	}

	public Instant reject(RejectionReason reason, Clock clock) {
		Assert.notNull(reason, "reason must not be null");
		requireSuggestion();
		Instant decidedAt = clock.instant();
		moderationStatus = ModerationStatus.REJECTED;
		registerEvent(reviewed(SuggestionReviewed.Outcome.REJECTED, reason, decidedAt));
		return decidedAt;
	}

	private void requireSuggestion() {
		Assert.state(isSuggestion(), "only a suggestion waiting for review can be decided");
	}

	private SuggestionReviewed reviewed(SuggestionReviewed.Outcome outcome, @Nullable RejectionReason reason,
			Instant decidedAt) {
		return new SuggestionReviewed(UUID.randomUUID(), contributorId, id, outcome, name, false, null, reason,
				decidedAt);
	}

}
