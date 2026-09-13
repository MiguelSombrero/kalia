package fi.kalia.feed.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.TestTokens;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.feed.application.FeedCursorCodec;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
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

	@Autowired
	private FeedCursorCodec cursorCodec;

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

	@Test
	void sinceReturnsEveryEventAfterTheCursorExactlyOnceNewestFirst() {
		FeedLine anchor = recordLine(makePublicProfile("since-anchor-user"), catalogBeers.get(0).getId(), 1,
				Instant.now());
		recordLine(makePublicProfile("since-first-new-user"), catalogBeers.get(0).getId(), 1, Instant.now());
		recordLine(makePublicProfile("since-second-new-user"), catalogBeers.get(0).getId(), 1, Instant.now());

		String body = readSince(cursorCodec.encode(anchor.getSequenceNumber()), MAX_SIZE);

		List<String> usernames = JsonPath.read(body, "$.content[*].username");
		assertThat(usernames).doesNotContain("since-anchor-user");
		assertThat(usernames.indexOf("since-second-new-user")).isLessThan(usernames.indexOf("since-first-new-user"));
	}

	// Pins the ordering guarantee ADR-0058 exists for: a row whose transaction
	// commits after this cursor is delivered even when its own occurredAt
	// reads earlier than the cursor's — an implementation ordering on
	// occurredAt alone would wrongly exclude it.
	@Test
	void anEventCommittingAfterALaterTimestampedOneIsStillDelivered() {
		FeedLine laterTimestamp = recordLine(makePublicProfile("reorder-later-timestamp-user"),
				catalogBeers.get(0).getId(), 1, Instant.now().plusSeconds(3600));
		String cursorTakenBetweenCommits = cursorCodec.encode(laterTimestamp.getSequenceNumber());

		recordLine(makePublicProfile("reorder-earlier-timestamp-user"), catalogBeers.get(0).getId(), 1,
				Instant.now());

		String body = readSince(cursorTakenBetweenCommits, MAX_SIZE);

		assertThat((List<String>) JsonPath.read(body, "$.content[*].username"))
				.contains("reorder-earlier-timestamp-user");
	}

	@Test
	void anIncrementEnforcesThePrivateCellarRuleLikeTheFirstPage() {
		FeedLine anchor = recordLine(makePublicProfile("increment-visibility-anchor-user"),
				catalogBeers.get(0).getId(), 1, Instant.now());
		recordLine(makePrivateProfile("increment-private-user"), catalogBeers.get(0).getId(), 1, Instant.now());

		String firstPageBody = readFeed(null);
		String incrementBody = readSince(cursorCodec.encode(anchor.getSequenceNumber()), MAX_SIZE);

		assertThat(firstPageBody).doesNotContain("increment-private-user");
		assertThat(incrementBody).doesNotContain("increment-private-user");
	}

	@Test
	void aMalformedCursorAnswersProblemJson() {
		client.get().uri("/api/v1/feed?since=not-a-valid-cursor!!")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	// The cursor is opaque in fact, not only by convention: hand-encoding the
	// exact shape the server used to produce (before signing) — for a real,
	// currently-existing position — is still rejected, because it carries no
	// signature. A client cannot come to depend on "it's just a number".
	@Test
	void aHandConstructedCursorForARealPositionIsRejectedWithoutTheServersSignature() {
		FeedLine anchor = recordLine(makePublicProfile("hand-rolled-cursor-user"), catalogBeers.get(0).getId(), 1,
				Instant.now());
		String unsignedCursor = Base64.getUrlEncoder().withoutPadding()
				.encodeToString(Long.toString(anchor.getSequenceNumber()).getBytes(StandardCharsets.UTF_8));

		client.get().uri("/api/v1/feed?since={cursor}", unsignedCursor)
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void aCursorOlderThanTheThirtyDayWindowAnswersStartOverNotAPartialResult() {
		FeedLine agedOut = recordLine(makePublicProfile("aged-out-cursor-user"), catalogBeers.get(0).getId(), 1,
				Instant.now().minus(40, ChronoUnit.DAYS));

		String body = readSince(cursorCodec.encode(agedOut.getSequenceNumber()), MAX_SIZE);

		assertThat((List<Object>) JsonPath.read(body, "$.content")).isEmpty();
		assertThat((Boolean) JsonPath.read(body, "$.startOver")).isTrue();
	}

	@Test
	void anIncrementIsCappedAndTellsTheCallerItWasTruncated() {
		FeedLine anchor = recordLine(makePublicProfile("increment-cap-anchor-user"), catalogBeers.get(0).getId(), 1,
				Instant.now());
		recordLine(makePublicProfile("increment-cap-user-1"), catalogBeers.get(0).getId(), 1, Instant.now());
		recordLine(makePublicProfile("increment-cap-user-2"), catalogBeers.get(0).getId(), 1, Instant.now());
		recordLine(makePublicProfile("increment-cap-user-3"), catalogBeers.get(0).getId(), 1, Instant.now());

		String body = readSince(cursorCodec.encode(anchor.getSequenceNumber()), 2);

		List<String> usernames = JsonPath.read(body, "$.content[*].username");
		assertThat(usernames).hasSize(2).contains("increment-cap-user-1", "increment-cap-user-2")
				.doesNotContain("increment-cap-user-3");
		assertThat((String) JsonPath.read(body, "$.nextCursor")).isNotNull();
	}

	@Test
	void beforeReturnsEveryEventBeforeTheCursorExactlyOnceNewestFirst() {
		recordLine(makePublicProfile("before-older-user"), catalogBeers.get(0).getId(), 1,
				Instant.now().minusSeconds(120));
		FeedLine anchor = recordLine(makePublicProfile("before-anchor-user"), catalogBeers.get(0).getId(), 1,
				Instant.now().minusSeconds(60));
		recordLine(makePublicProfile("before-newer-user"), catalogBeers.get(0).getId(), 1, Instant.now());

		String body = readBefore(cursorCodec.encode(anchor.getSequenceNumber()), MAX_SIZE);

		List<String> usernames = JsonPath.read(body, "$.content[*].username");
		assertThat(usernames).doesNotContain("before-anchor-user", "before-newer-user")
				.contains("before-older-user");
	}

	// A row recorded (inserted) after the window closed on it still has a
	// sequence number below a same-day anchor's, so only the window cutoff —
	// not sequence order alone — keeps it out of a `before` read. This is
	// the "stops rather than loops past the edge of the window" guarantee,
	// checked the same way readRecent's window test is: for the fixture this
	// test controls, not for the response being empty, since the table is
	// shared global state across this class.
	@Test
	void aBeforeReadExcludesEventsOutsideTheThirtyDayWindow() {
		UUID tooOldUser = makePublicProfile("before-window-excluded-user");
		recordLine(tooOldUser, catalogBeers.get(0).getId(), 1, Instant.now().minus(40, ChronoUnit.DAYS));
		FeedLine anchor = recordLine(makePublicProfile("before-window-anchor-user"), catalogBeers.get(0).getId(), 1,
				Instant.now());

		String body = readBefore(cursorCodec.encode(anchor.getSequenceNumber()), MAX_SIZE);

		assertThat(body).doesNotContain("before-window-excluded-user");
	}

	@Test
	void aBeforeReadEnforcesThePrivateCellarRuleLikeTheFirstPage() {
		FeedLine anchor = recordLine(makePublicProfile("before-visibility-anchor-user"),
				catalogBeers.get(0).getId(), 1, Instant.now());
		recordLine(makePrivateProfile("before-private-user"), catalogBeers.get(0).getId(), 1,
				Instant.now().minusSeconds(1));

		String body = readBefore(cursorCodec.encode(anchor.getSequenceNumber()), MAX_SIZE);

		assertThat(body).doesNotContain("before-private-user");
	}

	@Test
	void aMalformedBeforeCursorAnswersProblemJson() {
		client.get().uri("/api/v1/feed?before=not-a-valid-cursor!!")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void sinceAndBeforeTogetherAreRejected() {
		FeedLine anchor = recordLine(makePublicProfile("since-and-before-user"), catalogBeers.get(0).getId(), 1,
				Instant.now());
		String cursor = cursorCodec.encode(anchor.getSequenceNumber());

		client.get().uri("/api/v1/feed?since={cursor}&before={cursor}", cursor, cursor)
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

	private FeedLine recordLine(UUID userId, UUID beerId, int quantity, Instant occurredAt) {
		return lines.save(FeedLine.bottleAdded(UUID.randomUUID(), userId, beerId, quantity, null, occurredAt));
	}

	private String readSince(String since, int size) {
		return client.get().uri("/api/v1/feed?since={since}&size={size}", since, size)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

	private String readBefore(String before, int size) {
		return client.get().uri("/api/v1/feed?before={before}&size={size}", before, size)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
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
