package fi.kalia.catalog.internal;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.springframework.util.Assert;

@Entity
@Table(name = "brewery", schema = "catalog")
public class Brewery {

	@Id
	@GeneratedValue
	private UUID id;

	private String name;

	private String country;

	private String city;

	private Instant createdAt;

	protected Brewery() {
		// JPA
	}

	private Brewery(String name, String country, String city) {
		this.name = name;
		this.country = country;
		this.city = city;
		this.createdAt = Instant.now();
	}

	public static Brewery create(String name, String country, String city) {
		Assert.hasText(name, "name must not be blank");
		Assert.hasText(country, "country must not be blank");
		return new Brewery(name, country, city);
	}

	public UUID getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public String getCountry() {
		return country;
	}

	public String getCity() {
		return city;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

}
