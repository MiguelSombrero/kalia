package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BeerTest {

	private static final Instant NOW = Instant.parse("2020-02-03T04:05:06Z");

	private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

	private final Brewery brewery = Brewery.create("Test Brewery", "FI", null, CLOCK);

	@Test
	void aCatalogBeerIsCreatedAtTheClocksInstant() {
		Beer beer = Beer.create(brewery, "Test IPA", "IPA", new BigDecimal("6.5"), CLOCK);

		assertThat(beer.getCreatedAt()).isEqualTo(NOW);
	}

	@Test
	void aContributedBeerIsCreatedAtTheClocksInstant() {
		Beer beer = Beer.addedBy(UUID.randomUUID(), brewery, "Test IPA", "IPA", new BigDecimal("6.5"), CLOCK);

		assertThat(beer.getCreatedAt()).isEqualTo(NOW);
	}

}
