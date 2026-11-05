package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BreweryTest {

	private static final Instant NOW = Instant.parse("2020-02-03T04:05:06Z");

	private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

	@Test
	void aCatalogBreweryIsCreatedAtTheClocksInstant() {
		Brewery brewery = Brewery.create("Test Brewery", "FI", null, CLOCK);

		assertThat(brewery.getCreatedAt()).isEqualTo(NOW);
	}

	@Test
	void aContributedBreweryIsCreatedAtTheClocksInstant() {
		Brewery brewery = Brewery.addedBy(UUID.randomUUID(), "Test Brewery", "FI", "Helsinki", CLOCK);

		assertThat(brewery.getCreatedAt()).isEqualTo(NOW);
	}

}
