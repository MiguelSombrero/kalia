package fi.kalia.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.mockingDetails;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.cellar.BottleAdded;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import java.time.Duration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.BooleanSupplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.invocation.InvocationOnMock;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.modulith.events.core.EventPublicationRegistry;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Redelivery of a {@code BottleAdded} whose feed listener did not complete,
 * while the application keeps running (ADR-0081). The resubmission timings
 * are shortened so a test waits seconds rather than minutes; the attempt cap
 * is left at its production value.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"kalia.events.resubmission.interval=200ms",
		"kalia.events.resubmission.min-age=500ms" })
@AutoConfigureRestTestClient
@ExtendWith(OutputCaptureExtension.class)
class FeedRedeliveryIT {

	private static final Duration PATIENCE = Duration.ofSeconds(15);

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beers;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoSpyBean
	private FeedLineRepository feedLines;

	@MockitoSpyBean
	private EventPublicationRegistry registry;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
	}

	@Test
	void aListenerThatFailsOnceIsRecordedAfterResubmission() {
		UUID userId = authenticate("fails-once-token", "fails-once-user");
		willThrow(new RuntimeException("database hiccup")).willAnswer(this::callThrough)
				.given(feedLines).save(argThat(line -> line != null && line.getUserId().equals(userId)));

		addBottle("fails-once-token");

		awaitUntil(() -> !linesFor(userId).isEmpty());
		assertThat(linesFor(userId)).hasSize(1);
	}

	@Test
	void redeliveringAnAlreadyRecordedEventAddsNoSecondLine() {
		UUID userId = authenticate("recorded-twice-token", "recorded-twice-user");
		// The line commits, then marking the publication complete fails: the
		// window in which a real crash leaves a recorded event to be delivered
		// again.
		willThrow(new RuntimeException("registry unavailable")).willCallRealMethod()
				.given(registry).markCompleted(argThat(event -> isFor(event, userId)), any());

		addBottle("recorded-twice-token");

		awaitUntil(() -> !linesFor(userId).isEmpty());
		UUID eventId = linesFor(userId).getFirst().getEventId();
		awaitUntil(() -> publicationsFor(userId).isEmpty());

		verify(feedLines, times(2)).existsByEventId(eventId);
		assertThat(linesFor(userId)).hasSize(1);
	}

	@Test
	void aCompletedPublicationIsRemovedFromTheRegistry() {
		UUID userId = authenticate("completed-token", "completed-user");

		addBottle("completed-token");

		awaitUntil(() -> !linesFor(userId).isEmpty());
		awaitUntil(() -> publicationsFor(userId).isEmpty());
		assertThat(jdbc.queryForObject("SELECT count(*) FROM event_publication WHERE completion_date IS NOT NULL",
				Integer.class)).isZero();
	}

	@Test
	void anEventWhoseListenerAlwaysFailsStopsAfterFiveAttemptsAndIsLoggedAtError(CapturedOutput output) {
		UUID userId = authenticate("poison-token", "poison-user");
		willThrow(new RuntimeException("poison")).given(feedLines)
				.save(argThat(line -> line != null && line.getUserId().equals(userId)));

		addBottle("poison-token");

		awaitUntil(() -> output.getOut().contains("ERROR") && !publicationsFor(userId).isEmpty()
				&& output.getOut().contains(publicationsFor(userId).getFirst().get("id").toString()));
		Map<String, Object> publication = publicationsFor(userId).getFirst();
		assertThat(publication).containsEntry("status", "FAILED").containsEntry("completion_attempts", 5);
		assertThat(output.getOut()).containsPattern("ERROR.*" + publication.get("id"));

		// Several more resubmission ticks, past the minimum age: none of them
		// may try the event a sixth time.
		pause(Duration.ofSeconds(2));
		assertThat(publicationsFor(userId).getFirst()).containsEntry("completion_attempts", 5);
		verify(feedLines, times(5)).save(argThat(line -> line != null && line.getUserId().equals(userId)));
		assertThat(linesFor(userId)).isEmpty();
	}

	// A spied Spring Data repository is an interface proxy, so there is no
	// real method to call: the spy's own default answer is what delegates.
	private Object callThrough(InvocationOnMock invocation) throws Throwable {
		return mockingDetails(feedLines).getMockCreationSettings().getDefaultAnswer().answer(invocation);
	}

	private static boolean isFor(Object event, UUID userId) {
		return event instanceof BottleAdded added && added.userId().equals(userId);
	}

	private UUID authenticate(String token, String username) {
		UUID userId = UUID.randomUUID();
		given(jwtDecoder.decode(token)).willReturn(TestTokens.user(userId.toString(), username));
		return userId;
	}

	private void addBottle(String token) {
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

	private List<Map<String, Object>> publicationsFor(UUID userId) {
		return jdbc.queryForList(
				"SELECT id, status, completion_attempts FROM event_publication WHERE serialized_event LIKE ?",
				"%" + userId + "%");
	}

	// Polls rather than verify(spy, timeout): the listener's own transaction
	// can still be short of committing when the spy has seen the call.
	private static void awaitUntil(BooleanSupplier condition) {
		long deadline = System.nanoTime() + PATIENCE.toNanos();
		while (!condition.getAsBoolean()) {
			assertThat(System.nanoTime()).as("condition not met within %s", PATIENCE).isLessThan(deadline);
			pause(Duration.ofMillis(50));
		}
	}

	private static void pause(Duration duration) {
		try {
			Thread.sleep(duration);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

}
