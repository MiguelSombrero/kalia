package fi.kalia.catalog.domain;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
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

	private String countryCode;

	private @Nullable String city;

	private @Nullable UUID contributorId;

	private Instant createdAt;

	private Brewery(String name, String countryCode, @Nullable String city) {
		this.name = name;
		this.countryCode = countryCode;
		this.city = city;
		this.createdAt = Instant.now();
	}

	public static Brewery create(String name, String countryCode, @Nullable String city) {
		Assert.hasText(name, "name must not be blank");
		Assert.isTrue(Country.isListed(countryCode), "countryCode must be a listed ISO 3166-1 code");
		return new Brewery(name, countryCode, city);
	}

	public static Brewery addedBy(UUID contributorId, String name, String countryCode, @Nullable String city) {
		Assert.notNull(contributorId, "contributorId must not be null");
		Brewery brewery = create(name.strip(), countryCode, city == null || city.isBlank() ? null : city.strip());
		brewery.contributorId = contributorId;
		return brewery;
	}

}
