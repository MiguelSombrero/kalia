package fi.kalia.notification.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.RejectionReason;
import fi.kalia.notification.domain.Notification;
import fi.kalia.notification.domain.Notification.Outcome;
import fi.kalia.notification.domain.NotificationRepository;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * A signed-in user's own notifications (ADR-0103): read, counted and acknowledged. Rows are
 * written straight through the repository so each state is exact; the listener that writes them
 * in production is {@code SuggestionReviewedListenerModuleIT}'s.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class NotificationApiIT {

	private static final String BASE = "/api/v1/notifications";

	private static final Instant DECIDED_AT = Instant.parse("2026-11-05T10:00:00Z");

	@Autowired
	private RestTestClient client;

	@Autowired
	private NotificationRepository notifications;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID me;

	private UUID someoneElse;

	@BeforeEach
	void setUp() {
		me = UUID.randomUUID();
		someoneElse = UUID.randomUUID();
		given(jwtDecoder.decode("me")).willReturn(TestTokens.user(me.toString(), "me-" + me));
		given(jwtDecoder.decode("other")).willReturn(TestTokens.user(someoneElse.toString(), "other-" + someoneElse));
	}

	@Test
	void aCallerReadsTheirOwnNotificationsNewestDecisionFirstAndNoOneElses() {
		Notification older = approval(me, "Older", DECIDED_AT);
		Notification newer = rejection(me, "Newer", DECIDED_AT.plusSeconds(60), RejectionReason.INAPPROPRIATE);
		approval(someoneElse, "Not Mine", DECIDED_AT.plusSeconds(120));

		String body = get(BASE + "?page=0&size=20", "me").expectStatus().isOk().expectBody(String.class)
				.returnResult().getResponseBody();

		assertThat(JsonPath.<List<String>>read(body, "$.content[*].id"))
				.containsExactly(newer.getId().toString(), older.getId().toString());
		assertThat((Integer) JsonPath.read(body, "$.totalElements")).isEqualTo(2);
		assertThat(body).doesNotContain("Not Mine");
	}

	@Test
	void aNotificationCarriesCodesAndNamesNoSentenceAndNoRecipient() {
		Notification edited = notifications.save(Notification.reviewed(UUID.randomUUID(), me, Outcome.APPROVED, true,
				UUID.randomUUID(), "As Decided", "as suggested", null, DECIDED_AT, Clock.systemUTC()));
		Notification rejected = rejection(me, "Rejected", DECIDED_AT.minusSeconds(10), RejectionReason.NOT_A_REAL_BEER);

		String body = get(BASE, "me").expectStatus().isOk().expectHeader().contentType(MediaType.APPLICATION_JSON)
				.expectBody(String.class).returnResult().getResponseBody();

		Map<String, Object> editedJson = JsonPath.read(body, "$.content[0]");
		assertThat(editedJson.keySet()).isEqualTo(
				Set.of("id", "outcome", "edited", "beerId", "beerName", "suggestedName", "decidedAt"));
		assertThat(editedJson).containsEntry("outcome", "APPROVED").containsEntry("edited", true)
				.containsEntry("beerId", edited.getBeerId().toString()).containsEntry("beerName", "As Decided")
				.containsEntry("suggestedName", "as suggested");
		assertThat(Instant.parse((String) editedJson.get("decidedAt"))).isEqualTo(DECIDED_AT);
		Map<String, Object> rejectedJson = JsonPath.read(body, "$.content[1]");
		assertThat(rejectedJson.keySet())
				.isEqualTo(Set.of("id", "outcome", "edited", "beerId", "beerName", "reason", "decidedAt"));
		assertThat(rejectedJson).containsEntry("outcome", "REJECTED").containsEntry("reason", "NOT_A_REAL_BEER")
				.containsEntry("edited", false);
		assertThat(body).doesNotContain(me.toString()).doesNotContain(edited.getEventId().toString())
				.doesNotContain(rejected.getEventId().toString());
	}

	@Test
	void theListIsPaginatedAcrossPagesWithoutRepeatingOrSkipping() {
		for (int i = 0; i < 5; i++) {
			approval(me, "Beer " + i, DECIDED_AT.plusSeconds(i));
		}

		String first = get(BASE + "?page=0&size=2", "me").expectStatus().isOk().expectBody(String.class)
				.returnResult().getResponseBody();
		String second = get(BASE + "?page=1&size=2", "me").expectStatus().isOk().expectBody(String.class)
				.returnResult().getResponseBody();
		String third = get(BASE + "?page=2&size=2", "me").expectStatus().isOk().expectBody(String.class)
				.returnResult().getResponseBody();

		assertThat((Integer) JsonPath.read(first, "$.totalElements")).isEqualTo(5);
		assertThat((Integer) JsonPath.read(first, "$.totalPages")).isEqualTo(3);
		assertThat(JsonPath.<List<String>>read(first, "$.content[*].beerName")).containsExactly("Beer 4", "Beer 3");
		assertThat(JsonPath.<List<String>>read(second, "$.content[*].beerName")).containsExactly("Beer 2", "Beer 1");
		assertThat(JsonPath.<List<String>>read(third, "$.content[*].beerName")).containsExactly("Beer 0");
	}

	@Test
	void pageParametersAreBounded() {
		for (String query : List.of("size=0", "size=101", "page=-1", "size=abc", "page=9999&size=100",
				"page=101&size=100")) {
			get(BASE + "?" + query, "me").expectStatus().isBadRequest().expectHeader()
					.contentType(MediaType.APPLICATION_PROBLEM_JSON);
		}
		get(BASE + "?page=100&size=100", "me").expectStatus().isOk();
	}

	@Test
	void theUnreadCountIsTheCallersOwnRowsAndIsReadWithoutTheList() {
		approval(me, "One", DECIDED_AT);
		approval(me, "Two", DECIDED_AT);
		approval(someoneElse, "Theirs", DECIDED_AT);

		String body = get(BASE + "/unread-count", "me").expectStatus().isOk().expectBody(String.class)
				.returnResult().getResponseBody();

		assertThat(JsonPath.<Map<String, Object>>read(body, "$")).isEqualTo(Map.of("count", 2));
	}

	@Test
	void anUnreadNotificationIsKeptWhateverItsAge() {
		Notification ancient = approval(me, "Years Ago", Instant.parse("2020-01-01T00:00:00Z"));
		jdbc.update("UPDATE notification.notification SET created_at = ? WHERE id = ?",
				Timestamp.from(Instant.parse("2020-01-01T00:00:00Z")), ancient.getId());

		String list = get(BASE, "me").expectStatus().isOk().expectBody(String.class).returnResult()
				.getResponseBody();

		assertThat(JsonPath.<List<String>>read(list, "$.content[*].id")).containsExactly(ancient.getId().toString());
		assertThat(notifications.existsById(ancient.getId())).isTrue();
	}

	@Test
	void openingTheListOrReadingTheCountAcknowledgesNothing() {
		approval(me, "One", DECIDED_AT);
		approval(me, "Two", DECIDED_AT);

		get(BASE, "me").expectStatus().isOk();
		get(BASE, "me").expectStatus().isOk();
		get(BASE + "/unread-count", "me").expectStatus().isOk();

		assertThat(notifications.countByRecipientId(me)).isEqualTo(2);
		assertThat(count("me")).isEqualTo(2);
	}

	@Test
	void acknowledgingDeletesTheRowAndTheCountFalls() {
		Notification first = approval(me, "One", DECIDED_AT);
		Notification second = approval(me, "Two", DECIDED_AT.plusSeconds(1));
		assertThat(count("me")).isEqualTo(2);

		client.delete().uri(BASE + "/{id}", first.getId()).header("Authorization", "Bearer me").exchange()
				.expectStatus().isNoContent();

		assertThat(notifications.existsById(first.getId())).isFalse();
		assertThat(notifications.existsById(second.getId())).isTrue();
		assertThat(count("me")).isEqualTo(1);
	}

	@Test
	void anotherUsersAnAlreadyAcknowledgedAndAnUnknownNotificationAreAnsweredAlike() {
		Notification theirs = approval(someoneElse, "Theirs", DECIDED_AT);
		Notification gone = approval(me, "Gone", DECIDED_AT);
		client.delete().uri(BASE + "/{id}", gone.getId()).header("Authorization", "Bearer me").exchange()
				.expectStatus().isNoContent();

		String another = acknowledge(theirs.getId(), "me");
		String already = acknowledge(gone.getId(), "me");
		String never = acknowledge(UUID.randomUUID(), "me");

		assertThat(notifications.existsById(theirs.getId())).isTrue();
		for (String body : List.of(another, already, never)) {
			assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(404);
		}
		assertThat((String) JsonPath.read(another, "$.detail")).isEqualTo(JsonPath.read(never, "$.detail"));
		assertThat((String) JsonPath.read(already, "$.detail")).isEqualTo(JsonPath.read(never, "$.detail"));
	}

	@Test
	void anotherUsersNotificationIsNeverInTheirListOrCount() {
		Notification mine = approval(me, "Mine", DECIDED_AT);

		String theirs = get(BASE, "other").expectStatus().isOk().expectBody(String.class).returnResult()
				.getResponseBody();

		assertThat(JsonPath.<List<String>>read(theirs, "$.content")).isEmpty();
		assertThat(count("other")).isZero();
		assertThat(notifications.existsById(mine.getId())).isTrue();
	}

	@Test
	void anIdThatIsNotAUuidIsABadRequest() {
		client.delete().uri(BASE + "/not-a-uuid").header("Authorization", "Bearer me").exchange().expectStatus()
				.isBadRequest();
	}

	@Test
	void anAnonymousCallerIsRefusedOnEveryOperation() {
		Notification mine = approval(me, "Mine", DECIDED_AT);

		client.get().uri(BASE).exchange().expectStatus().isUnauthorized();
		client.get().uri(BASE + "/unread-count").exchange().expectStatus().isUnauthorized();
		client.delete().uri(BASE + "/{id}", mine.getId()).exchange().expectStatus().isUnauthorized();

		assertThat(notifications.existsById(mine.getId())).isTrue();
	}

	private int count(String token) {
		String body = get(BASE + "/unread-count", token).expectStatus().isOk().expectBody(String.class)
				.returnResult().getResponseBody();
		return JsonPath.read(body, "$.count");
	}

	private String acknowledge(UUID id, String token) {
		return client.delete().uri(BASE + "/{id}", id).header("Authorization", "Bearer " + token).exchange()
				.expectStatus().isNotFound().expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class).returnResult().getResponseBody();
	}

	private RestTestClient.ResponseSpec get(String uri, String token) {
		return client.get().uri(uri).header("Authorization", "Bearer " + token).exchange();
	}

	private Notification approval(UUID recipient, String beerName, Instant decidedAt) {
		return notifications.save(Notification.reviewed(UUID.randomUUID(), recipient, Outcome.APPROVED, false,
				UUID.randomUUID(), beerName, null, null, decidedAt, Clock.systemUTC()));
	}

	private Notification rejection(UUID recipient, String beerName, Instant decidedAt, RejectionReason reason) {
		return notifications.save(Notification.reviewed(UUID.randomUUID(), recipient, Outcome.REJECTED, false,
				UUID.randomUUID(), beerName, null, reason, decidedAt, Clock.systemUTC()));
	}

}
