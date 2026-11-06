package fi.kalia.catalog.domain;

import fi.kalia.catalog.RejectionReason;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.util.Assert;

/** One decision on a contributed beer, written with the decision and never changed (ADR-0102). */
@Entity
@Table(name = "review", schema = "catalog")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Review {

	@Id
	@GeneratedValue
	private UUID id;

	private UUID beerId;

	private @Nullable UUID decidedBy;

	@Enumerated(EnumType.STRING)
	private ReviewOutcome outcome;

	@Enumerated(EnumType.STRING)
	private @Nullable RejectionReason reasonCode;

	private Instant decidedAt;

	private @Nullable String suggestedName;

	private @Nullable String suggestedStyle;

	private @Nullable BigDecimal suggestedAbv;

	private @Nullable UUID suggestedBreweryId;

	private @Nullable String suggestedBreweryName;

	private @Nullable String suggestedBreweryCountryCode;

	private @Nullable String suggestedBreweryCity;

	private Review(UUID beerId, UUID decidedBy, ReviewOutcome outcome, @Nullable RejectionReason reasonCode,
			Instant decidedAt) {
		this.beerId = beerId;
		this.decidedBy = decidedBy;
		this.outcome = outcome;
		this.reasonCode = reasonCode;
		this.decidedAt = decidedAt;
	}

	public static Review approval(UUID beerId, UUID decidedBy, Instant decidedAt) {
		return new Review(beerId, decidedBy, ReviewOutcome.APPROVED, null, decidedAt);
	}

	public static Review editedApproval(UUID beerId, UUID decidedBy, SuggestedValues suggested, Instant decidedAt) {
		Review review = approval(beerId, decidedBy, decidedAt);
		review.suggestedName = suggested.beerName();
		review.suggestedStyle = suggested.style();
		review.suggestedAbv = suggested.abv();
		review.suggestedBreweryId = suggested.breweryId();
		review.suggestedBreweryName = suggested.breweryName();
		review.suggestedBreweryCountryCode = suggested.breweryCountryCode();
		review.suggestedBreweryCity = suggested.breweryCity();
		return review;
	}

	public static Review removal(UUID beerId, UUID decidedBy, Instant decidedAt) {
		return new Review(beerId, decidedBy, ReviewOutcome.REMOVED, null, decidedAt);
	}

	public static Review rejection(UUID beerId, UUID decidedBy, RejectionReason reason, Instant decidedAt) {
		Assert.notNull(reason, "reason must not be null");
		return new Review(beerId, decidedBy, ReviewOutcome.REJECTED, reason, decidedAt);
	}

}
