package fi.kalia.feed;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.willThrow;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * The cross-module path: an HTTP add-bottle request through {@code cellar},
 * consumed by {@code feed}'s real {@code @ApplicationModuleListener}.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class FeedEventListenerIT {

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beers;

	@MockitoSpyBean
	private FeedLineRepository feedLines;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
	}

	@Test
	void aFailingConsumerDoesNotFailTheCellarAddition() {
		UUID userId = authenticate("failing-consumer-token", "failing-consumer");
		willThrow(new RuntimeException("boom")).given(feedLines).save(any());

		// The 201 already proves the cellar write succeeded; a synchronous
		// @EventListener in place of @ApplicationModuleListener would have
		// this throw fail the request instead (ADR-0058).
		addBottle("failing-consumer-token", beerId, "BOTTLE", null, null);

		awaitAttemptFor(userId);
	}

	@Test
	void everyAdditionIsRecordedRegardlessOfCellarVisibility() {
		// No profile row is created for this user at all — a missing profile
		// reads as private (docs/architecture.md §3) — yet the write path
		// records the line anyway: nothing on it consults visibility.
		UUID userId = authenticate("private-cellar-token", "private-cellar-user");

		addBottle("private-cellar-token", beerId, "BOTTLE", null, null);

		assertThat(awaitLinesFor(userId)).hasSize(1);
	}

	@Test
	void bulkAddRecordsOneLineCarryingTheCount() {
		UUID userId = authenticate("bulk-add-token", "bulk-add-user");

		addBottle("bulk-add-token", beerId, "BOTTLE", null, null, 6);

		List<FeedLine> lines = awaitLinesFor(userId);
		assertThat(lines).hasSize(1);
		assertThat(lines.getFirst().getQuantity()).isEqualTo(6);
	}

	@Test
	void editingOrRemovingABottleAfterwardsLeavesTheStoredLineUnchanged() {
		UUID userId = authenticate("edit-after-token", "edit-after-user");
		LocalDate brewedDate = LocalDate.now().minusMonths(2);

		String addResponse = addBottle("edit-after-token", beerId, "BOTTLE", brewedDate.toString(), null);
		UUID bottleId = UUID.fromString(JsonPath.read(addResponse, "$[0].id"));

		FeedLine recorded = awaitLinesFor(userId).getFirst();
		assertThat(recorded.getQuantity()).isEqualTo(1);
		assertThat(recorded.getBrewedDate()).isEqualTo(brewedDate);

		client.method(HttpMethod.PATCH).uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", "Bearer edit-after-token")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("containerType", "CAN", "brewedDate", brewedDate.minusMonths(1).toString()))
				.exchange()
				.expectStatus().isOk();

		client.delete().uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", "Bearer edit-after-token")
				.exchange()
				.expectStatus().isNoContent();

		FeedLine stillTheSame = feedLines.findById(recorded.getId()).orElseThrow();
		assertThat(stillTheSame.getQuantity()).isEqualTo(1);
		assertThat(stillTheSame.getBrewedDate()).isEqualTo(brewedDate);
	}

	private UUID authenticate(String token, String username) {
		UUID userId = UUID.randomUUID();
		given(jwtDecoder.decode(token)).willReturn(TestTokens.user(userId.toString(), username));
		return userId;
	}

	// Polls the repository rather than verify()-ing the spy: the spy records
	// a save() call the moment it is invoked, inside the listener's own
	// REQUIRES_NEW transaction, which can still be short of committing when
	// verify() returns — a read against that same row here would then race
	// the commit instead of waiting for it.
	private List<FeedLine> awaitLinesFor(UUID userId) {
		long deadline = System.currentTimeMillis() + 5000;
		List<FeedLine> lines;
		do {
			lines = linesFor(userId);
			if (!lines.isEmpty()) {
				return lines;
			}
			sleep();
		} while (System.currentTimeMillis() < deadline);
		return lines;
	}

	// Scoped to this test's own userId: the spy is shared across every test
	// method in this class, and each @ApplicationModuleListener invocation
	// runs on its own async thread, so an unscoped verify(any()) can be
	// satisfied by another test's still-in-flight call instead of this one.
	private void awaitAttemptFor(UUID userId) {
		verify(feedLines, timeout(5000)).save(argThat(line -> line.getUserId().equals(userId)));
	}

	private List<FeedLine> linesFor(UUID userId) {
		return feedLines.findAll().stream().filter(line -> line.getUserId().equals(userId)).toList();
	}

	private static void sleep() {
		try {
			Thread.sleep(50);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	private String addBottle(String token, UUID beerId, String containerType, String brewedDate,
			String bestBeforeDate) {
		return addBottle(token, beerId, containerType, brewedDate, bestBeforeDate, null);
	}

	private String addBottle(String token, UUID beerId, String containerType, String brewedDate,
			String bestBeforeDate, Integer quantity) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", beerId.toString());
		request.put("containerType", containerType);
		if (brewedDate != null) {
			request.put("brewedDate", brewedDate);
		}
		if (bestBeforeDate != null) {
			request.put("bestBeforeDate", bestBeforeDate);
		}
		if (quantity != null) {
			request.put("quantity", quantity);
		}
		return client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isCreated()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
