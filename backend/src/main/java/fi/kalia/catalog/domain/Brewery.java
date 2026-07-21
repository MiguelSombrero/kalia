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

	private String country;

	private @Nullable String city;

	private Instant createdAt;

	private Brewery(String name, String country, @Nullable String city) {
		this.name = name;
		this.country = country;
		this.city = city;
		this.createdAt = Instant.now();
	}

	public static Brewery create(String name, String country, @Nullable String city) {
		Assert.hasText(name, "name must not be blank");
		Assert.hasText(country, "country must not be blank");
		return new Brewery(name, country, city);
	}

}
