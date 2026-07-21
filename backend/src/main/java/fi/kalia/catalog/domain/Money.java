package fi.kalia.catalog.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/**
 * Monetary amount as integer cents to avoid floating point (docs/architecture.md §3).
 */
@Embeddable
public record Money(
		@Column(name = "price_cents") int cents,
		@Column(name = "currency", length = 3) String currency) {

	public Money {
		if (cents < 0) {
			throw new IllegalArgumentException("cents must not be negative");
		}
		if (currency == null || currency.length() != 3) {
			throw new IllegalArgumentException("currency must be a 3-letter ISO code");
		}
	}

}
