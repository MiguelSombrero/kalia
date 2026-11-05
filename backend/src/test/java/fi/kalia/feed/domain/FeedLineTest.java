package fi.kalia.feed.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class FeedLineTest {

	private static final Instant NOW = Instant.parse("2020-02-03T04:05:06Z");

	@Test
	void aLineIsRecordedAtTheClocksInstantApartFromWhenItsActHappened() {
		Instant occurredAt = Instant.parse("2020-02-01T00:00:00Z");

		FeedLine line = FeedLine.bottleAdded(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, null,
				occurredAt, Clock.fixed(NOW, ZoneOffset.UTC));

		assertThat(line.getCreatedAt()).isEqualTo(NOW);
		assertThat(line.getUpdatedAt()).isEqualTo(NOW);
		assertThat(line.getOccurredAt()).isEqualTo(occurredAt);
	}

}
