package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.modulith.events.EventPublication;
import org.springframework.modulith.events.IncompleteEventPublications;

class EventPublicationResubmissionTest {

	private static final Instant PUBLISHED = Instant.parse("2020-02-03T04:05:06Z");

	private static final Duration MIN_AGE = Duration.ofMinutes(10);

	private final IncompleteEventPublications incomplete = mock(IncompleteEventPublications.class);

	@Test
	void aPublicationIsStaleOnceMinAgeHasPassedOnTheClock() {
		Predicate<EventPublication> filter = filterAt(PUBLISHED.plus(MIN_AGE).plusSeconds(1));

		assertThat(filter.test(publishedAt(PUBLISHED))).isTrue();
	}

	@Test
	void aPublicationYoungerThanMinAgeOnTheClockIsLeftAlone() {
		Predicate<EventPublication> filter = filterAt(PUBLISHED.plus(MIN_AGE).minusSeconds(1));

		assertThat(filter.test(publishedAt(PUBLISHED))).isFalse();
	}

	@SuppressWarnings("unchecked")
	private Predicate<EventPublication> filterAt(Instant now) {
		EventPublicationResubmission resubmission = new EventPublicationResubmission(incomplete,
				mock(JdbcTemplate.class), new SimpleMeterRegistry(), Clock.fixed(now, ZoneOffset.UTC), MIN_AGE, 3);

		resubmission.resubmitStale();

		ArgumentCaptor<Predicate<EventPublication>> filter = ArgumentCaptor.forClass(Predicate.class);
		verify(incomplete).resubmitIncompletePublications(filter.capture());
		return filter.getValue();
	}

	private static EventPublication publishedAt(Instant publicationDate) {
		EventPublication publication = mock(EventPublication.class);
		given(publication.getPublicationDate()).willReturn(publicationDate);
		given(publication.getCompletionAttempts()).willReturn(0);
		return publication;
	}

}
