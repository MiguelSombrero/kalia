package fi.kalia.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;

import fi.kalia.KaliaApplication;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.postgresql.PostgreSQLContainer;

/**
 * Redelivery after a restart (ADR-0081): the test's own context plays the
 * instance that left publications incomplete, and a second application
 * started against the same database plays its next start.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"kalia.events.resubmission.interval=1h" })
@AutoConfigureRestTestClient
class FeedRedeliveryOnRestartIT {

	private static final Duration PATIENCE = Duration.ofSeconds(15);

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beers;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PostgreSQLContainer postgres;

	@MockitoSpyBean
	private FeedLineRepository feedLines;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void publicationsLeftIncompleteAreDeliveredByTheNextStart() {
		UUID failedUser = authenticate("failed-token", "failed-user");
		UUID interruptedUser = authenticate("interrupted-token", "interrupted-user");
		willThrow(new RuntimeException("database down")).given(feedLines)
				.save(any());

		addBottle("failed-token");
		addBottle("interrupted-token");
		awaitUntil(() -> "FAILED".equals(statusFor(failedUser)) && "FAILED".equals(statusFor(interruptedUser)));
		// The state a crash leaves behind when it lands while a resubmission
		// is in flight.
		jdbc.update("UPDATE event_publication SET status = 'RESUBMITTED' WHERE serialized_event LIKE ?",
				"%" + interruptedUser + "%");

		try (ConfigurableApplicationContext nextStart = startAgainstTheSameDatabase()) {
			awaitUntil(() -> !linesFor(failedUser).isEmpty() && !linesFor(interruptedUser).isEmpty());
		}

		assertThat(linesFor(failedUser)).hasSize(1);
		assertThat(linesFor(interruptedUser)).hasSize(1);
	}

	private ConfigurableApplicationContext startAgainstTheSameDatabase() {
		// Arguments, not builder properties: those are defaults, which
		// application.properties' own datasource settings would override.
		return new SpringApplicationBuilder(KaliaApplication.class).run(
				"--spring.datasource.url=" + postgres.getJdbcUrl(),
				"--spring.datasource.username=" + postgres.getUsername(),
				"--spring.datasource.password=" + postgres.getPassword(),
				"--server.port=0");
	}

	private UUID authenticate(String token, String username) {
		UUID userId = UUID.randomUUID();
		given(jwtDecoder.decode(token)).willReturn(TestTokens.user(userId.toString(), username));
		return userId;
	}

	private void addBottle(String token) {
		UUID beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("beerId", beerId.toString(), "containerType", "BOTTLE"))
				.exchange()
				.expectStatus().isCreated();
	}

	private List<FeedLine> linesFor(UUID userId) {
		return feedLines.findAll().stream().filter(line -> line.getUserId().equals(userId)).toList();
	}

	private String statusFor(UUID userId) {
		return jdbc.queryForList("SELECT status FROM event_publication WHERE serialized_event LIKE ?", String.class,
				"%" + userId + "%").stream().findFirst().orElse(null);
	}

	private static void awaitUntil(BooleanSupplier condition) {
		long deadline = System.nanoTime() + PATIENCE.toNanos();
		while (!condition.getAsBoolean()) {
			assertThat(System.nanoTime()).as("condition not met within %s", PATIENCE).isLessThan(deadline);
			try {
				Thread.sleep(50);
			} catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		}
	}

}
