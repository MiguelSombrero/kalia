package fi.kalia.catalog.domain;

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

@Entity
@Table(name = "brewery", schema = "catalog")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Brewery {

	@Id
	@GeneratedValue
	private UUID id;

	private String name;

	private String nameSortKey;

	private String countryCode;

	private @Nullable String city;

	private @Nullable UUID contributorId;

	@Enumerated(EnumType.STRING)
	private ModerationStatus moderationStatus;

	private Instant createdAt;

	private Brewery(String name, String countryCode, @Nullable String city, Instant createdAt) {
		this.name = name;
		this.nameSortKey = BrewerySortKey.of(name);
		this.countryCode = countryCode;
		this.city = city;
		this.moderationStatus = ModerationStatus.APPROVED;
		this.createdAt = createdAt;
	}

	public static Brewery create(String name, String countryCode, @Nullable String city,
			Clock clock) {
		Assert.hasText(name, "name must not be blank");
		Assert.isTrue(Country.isListed(countryCode), "countryCode must be a listed ISO 3166-1 code");
		return new Brewery(name, countryCode, city, clock.instant());
	}

	public static Brewery addedBy(UUID contributorId, String name, String countryCode, @Nullable String city,
			Clock clock) {
		Assert.notNull(contributorId, "contributorId must not be null");
		Brewery brewery = create(name.strip(), countryCode, city == null || city.isBlank() ? null : city.strip(), clock);
		brewery.contributorId = contributorId;
		brewery.moderationStatus = ModerationStatus.PENDING;
		return brewery;
	}

	public void approveIfPending() {
		if (moderationStatus == ModerationStatus.PENDING) {
			moderationStatus = ModerationStatus.APPROVED;
		}
	}

	public void rejectIfPending() {
		if (moderationStatus == ModerationStatus.PENDING) {
			moderationStatus = ModerationStatus.REJECTED;
		}
	}

}
