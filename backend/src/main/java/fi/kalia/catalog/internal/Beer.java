package fi.kalia.catalog.internal;

import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.util.Assert;

@Entity
@Table(name = "beer", schema = "catalog")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Beer {

	@Id
	@GeneratedValue
	private UUID id;

	@ManyToOne(fetch = FetchType.LAZY, optional = false)
	@JoinColumn(name = "brewery_id")
	private Brewery brewery;

	private String name;

	private String style;

	private BigDecimal abv;

	private @Nullable String description;

	@Embedded
	private Money price;

	private Instant createdAt;

	private Beer(Brewery brewery, String name, String style, BigDecimal abv,
			@Nullable String description, Money price) {
		this.brewery = brewery;
		this.name = name;
		this.style = style;
		this.abv = abv;
		this.description = description;
		this.price = price;
		this.createdAt = Instant.now();
	}

	public static Beer create(Brewery brewery, String name, String style,
			BigDecimal abv, @Nullable String description, Money price) {
		Assert.notNull(brewery, "brewery must not be null");
		Assert.hasText(name, "name must not be blank");
		Assert.hasText(style, "style must not be blank");
		Assert.notNull(abv, "abv must not be null");
		Assert.isTrue(abv.signum() >= 0, "abv must not be negative");
		Assert.notNull(price, "price must not be null");
		return new Beer(brewery, name, style, abv, description, price);
	}

}
