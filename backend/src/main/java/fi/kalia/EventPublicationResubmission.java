package fi.kalia;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.SmartInitializingSingleton;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.modulith.events.EventPublication;
import org.springframework.modulith.events.IncompleteEventPublications;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.util.Assert;

@Slf4j
@Configuration(proxyBeanMethods = false)
@EnableScheduling
class EventPublicationResubmission implements SmartInitializingSingleton {

	private final IncompleteEventPublications incomplete;

	private final JdbcTemplate jdbc;

	private final Counter retries;

	private final Counter exhausted;

	private final Duration minAge;

	private final int maxAttempts;

	private final Set<UUID> reportedExhausted = ConcurrentHashMap.newKeySet();

	EventPublicationResubmission(IncompleteEventPublications incomplete, JdbcTemplate jdbc, MeterRegistry meters,
			@Value("${kalia.events.resubmission.min-age}") Duration minAge,
			@Value("${kalia.events.resubmission.max-attempts}") int maxAttempts) {
		Assert.isTrue(!minAge.isNegative(), "kalia.events.resubmission.min-age must not be negative");
		Assert.isTrue(maxAttempts >= 1, "kalia.events.resubmission.max-attempts must be at least 1");
		this.incomplete = incomplete;
		this.jdbc = jdbc;
		// Prometheus omits a counter until its first increment; register both now.
		this.retries = meters.counter("kalia.events.publication.retries");
		this.exhausted = meters.counter("kalia.events.publication.exhausted");
		this.minAge = minAge;
		this.maxAttempts = maxAttempts;
	}

	@Override
	public void afterSingletonsInstantiated() {
		// Nothing is in flight yet, so a RESUBMITTED row is one a crash cut
		// short, and Modulith never claims a RESUBMITTED row again.
		jdbc.update("UPDATE event_publication SET status = 'FAILED' WHERE status = 'RESUBMITTED'");
		incomplete.resubmitIncompletePublications(this::hasAttemptsLeft);
	}

	@Scheduled(fixedDelayString = "${kalia.events.resubmission.interval}",
			initialDelayString = "${kalia.events.resubmission.interval}")
	void resubmitStale() {
		Instant cutoff = Instant.now().minus(minAge);
		incomplete.resubmitIncompletePublications(
				publication -> lastAttemptStarted(publication).isBefore(cutoff) && hasAttemptsLeft(publication));
	}

	private boolean hasAttemptsLeft(EventPublication publication) {
		if (publication.getCompletionAttempts() < maxAttempts) {
			retries.increment();
			return true;
		}
		if (reportedExhausted.add(publication.getIdentifier())) {
			exhausted.increment();
			log.error("Event publication {} of {} is still incomplete after {} attempts and will not be resubmitted",
					publication.getIdentifier(), publication.getEvent().getClass().getName(),
					publication.getCompletionAttempts());
		}
		return false;
	}

	private static Instant lastAttemptStarted(EventPublication publication) {
		return Objects.requireNonNullElse(publication.getLastResubmissionDate(), publication.getPublicationDate());
	}

}
