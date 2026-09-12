package fi.kalia.feed.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.TestTokens;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class FeedControllerIT {

	private static final int MAX_SIZE = 99;

	@Autowired
	private RestTestClient client;

	@Autowired
	private FeedLineRepository lines;

	@Autowired
	private ProfileRepository profiles;

	@Autowired
	private BeerRepository beers;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private List<Beer> catalogBeers;

	@BeforeEach
	void setUp() {
		catalogBeers = beers.findAll(Pageable.ofSize(2)).getContent();
	}

	// The feed is shared, global state: other tests in this class leave their
	// own lines behind (no per-test rollback under @SpringBootTest), so every
	// assertion here checks only where the fixtures it created land relative
	// to each other or to the whole body — never the response's total length.
	@Test
	void aSignedOutCallerReadsRecentEventsNewestFirst() {
		UUID olderUser = makePublicProfile("older-user");
		UUID newerUser = makePublicProfile("newer-user");
		recordLine(olderUser, catalogBeers.get(0).getId(), 1, Instant.now().minusSeconds(60));
		recordLine(newerUser, catalogBeers.get(1).getId(), 2, Instant.now());

		String body = readFeedWithSize(MAX_SIZE);

		List<String> usernames = JsonPath.read(body, "$.content[*].username");
		assertThat(usernames.indexOf("newer-user")).isLessThan(usernames.indexOf("older-user"));
	}

	@Test
	void aCellarMadePrivateAfterTheEventIsRecordedIsNotServed() {
		UUID userId = makePublicProfile("goes-private-user");
		recordLine(userId, catalogBeers.get(0).getId(), 1, Instant.now());
		flipVisibility(userId, false);

		String body = readFeed(null);

		assertThat((List<String>) JsonPath.read(body, "$.content[*].username")).doesNotContain("goes-private-user");
	}

	@Test
	void aCellarMadePublicAfterTheEventIsRecordedIsServed() {
		UUID userId = makePrivateProfile("goes-public-user");
		recordLine(userId, catalogBeers.get(0).getId(), 1, Instant.now());
		flipVisibility(userId, true);

		String body = readFeedWithSize(MAX_SIZE);

		assertThat((List<String>) JsonPath.read(body, "$.content[*].username")).contains("goes-public-user");
	}

	@Test
	void aPrivateCellarsEventIsAbsentEntirelyNotStripped() {
		UUID userId = makePrivateProfile("private-user");
		recordLine(userId, catalogBeers.get(0).getId(), 1, Instant.now());

		String body = readFeed(null);

		assertThat(body).doesNotContain("private-user");
	}

	@Test
	void signedInAndSignedOutCallersReceiveByteIdenticalResponses() {
		UUID userId = makePublicProfile("either-way-user");
		recordLine(userId, catalogBeers.get(0).getId(), 3, Instant.now());

		given(jwtDecoder.decode("some-token")).willReturn(TestTokens.user(userId.toString(), "the-caller"));
		String signedIn = readFeed("some-token");
		String signedOut = readFeed(null);

		assertThat(signedIn).isEqualTo(signedOut);
	}

	@Test
	void aLineWhoseBeerNoLongerResolvesIsDropped() {
		UUID userId = makePublicProfile("unresolvable-beer-user");
		recordLine(userId, UUID.randomUUID(), 1, Instant.now());

		String body = readFeedWithSize(MAX_SIZE);

		assertThat(body).doesNotContain("unresolvable-beer-user");
	}

	@Test
	void anEventOlderThanTheThirtyDayWindowIsExcluded() {
		UUID userId = makePublicProfile("stale-user");
		recordLine(userId, catalogBeers.get(0).getId(), 1, Instant.now().minus(31, ChronoUnit.DAYS));

		String body = readFeedWithSize(MAX_SIZE);

		assertThat(body).doesNotContain("stale-user");
	}

	@Test
	void aHostileSizeIsRejectedWithProblemJsonRatherThanAnUnboundedQuery() {
		client.get().uri("/api/v1/feed?size=0")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);

		client.get().uri("/api/v1/feed?size=100")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	private UUID makePublicProfile(String username) {
		return saveProfile(username, true);
	}

	private UUID makePrivateProfile(String username) {
		return saveProfile(username, false);
	}

	private UUID saveProfile(String username, boolean cellarPublic) {
		UUID userId = UUID.randomUUID();
		Profile profile = Profile.create(userId, username);
		if (cellarPublic) {
			profile.changeCellarVisibility(true);
		}
		profiles.save(profile);
		return userId;
	}

	private void flipVisibility(UUID userId, boolean cellarPublic) {
		Profile profile = profiles.findById(userId).orElseThrow();
		profile.changeCellarVisibility(cellarPublic);
		profiles.save(profile);
	}

	private void recordLine(UUID userId, UUID beerId, int quantity, Instant occurredAt) {
		lines.save(FeedLine.bottleAdded(UUID.randomUUID(), userId, beerId, quantity, null, occurredAt));
	}

	private String readFeed(String token) {
		RestTestClient.RequestHeadersSpec<?> request = client.get().uri("/api/v1/feed");
		if (token != null) {
			request = request.header("Authorization", "Bearer " + token);
		}
		return request.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

	private String readFeedWithSize(int size) {
		return client.get().uri("/api/v1/feed?size={size}", size)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
