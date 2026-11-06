package fi.kalia.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Map;
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
 * The whole path: an admin's decision through {@code catalog}, the event it publishes, and the
 * contributor reading what became of the suggestion (ADR-0103).
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class SuggestionDecisionNotificationIT {

	private static final String NOTIFICATIONS = "/api/v1/notifications";

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID adminId;

	private UUID contributorId;

	@BeforeEach
	void setUp() {
		adminId = UUID.randomUUID();
		contributorId = UUID.randomUUID();
		given(jwtDecoder.decode("admin")).willReturn(TestTokens.admin(adminId.toString(), "admin-" + adminId));
		given(jwtDecoder.decode("contributor"))
				.willReturn(TestTokens.user(contributorId.toString(), "contributor-" + contributorId));
	}

	@Test
	void anApprovalTellsTheContributorAndNobodyElse() {
		UUID beer = suggestion("Approved Through The Api", contributorId);

		decide(beer, "approval", null);

		String body = awaitNotifications("contributor", 1);
		assertThat((String) JsonPath.read(body, "$.content[0].outcome")).isEqualTo("APPROVED");
		assertThat((Boolean) JsonPath.read(body, "$.content[0].edited")).isFalse();
		assertThat((String) JsonPath.read(body, "$.content[0].beerId")).isEqualTo(beer.toString());
		assertThat((String) JsonPath.read(body, "$.content[0].beerName")).startsWith("Approved Through The Api");
		assertThat(unreadCount("admin")).isZero();
	}

	@Test
	void aRejectionTellsTheContributorTheReasonCode() {
		UUID beer = suggestion("Rejected Through The Api", contributorId);

		decide(beer, "rejection", Map.of("reason", "INCORRECT_DETAILS"));

		String body = awaitNotifications("contributor", 1);
		assertThat((String) JsonPath.read(body, "$.content[0].outcome")).isEqualTo("REJECTED");
		assertThat((String) JsonPath.read(body, "$.content[0].reason")).isEqualTo("INCORRECT_DETAILS");
	}

	@Test
	void aDecisionOnTheAdminsOwnSuggestionNotifiesTheAdminAsContributor() {
		UUID beer = suggestion("The Admins Own Beer", adminId);

		decide(beer, "approval", null);

		String body = awaitNotifications("admin", 1);
		assertThat((String) JsonPath.read(body, "$.content[0].beerId")).isEqualTo(beer.toString());
		assertThat((String) JsonPath.read(body, "$.content[0].outcome")).isEqualTo("APPROVED");
	}

	@Test
	void aLaterEditOrRemovalOfTheBeerLeavesTheNotificationAsItWasWritten() {
		UUID beer = suggestion("Name When Approved", contributorId);
		decide(beer, "approval", null);
		String written = awaitNotifications("contributor", 1);

		jdbc.update("UPDATE catalog.beer SET name = 'Renamed Afterwards' WHERE id = ?", beer);
		jdbc.update("UPDATE catalog.beer SET moderation_status = 'REMOVED' WHERE id = ?", beer);

		String reread = awaitNotifications("contributor", 1);
		assertThat((String) JsonPath.read(reread, "$.content[0].beerName"))
				.isEqualTo(JsonPath.read(written, "$.content[0].beerName"))
				.startsWith("Name When Approved");
		assertThat((String) JsonPath.read(reread, "$.content[0].outcome")).isEqualTo("APPROVED");
	}

	private void decide(UUID beer, String decision, Map<String, String> body) {
		RestTestClient.RequestBodySpec request = client.post()
				.uri("/api/v1/admin/suggestions/{id}/" + decision, beer).header("Authorization", "Bearer admin");
		if (body == null) {
			request.exchange().expectStatus().isOk();
		}
		else {
			request.contentType(MediaType.APPLICATION_JSON).body(body).exchange().expectStatus().isOk();
		}
	}

	// The listener is asynchronous: the notification arrives after the decision's response.
	private String awaitNotifications(String token, int expected) {
		long deadline = System.currentTimeMillis() + 5000;
		String body;
		do {
			body = client.get().uri(NOTIFICATIONS).header("Authorization", "Bearer " + token).exchange()
					.expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
			if (JsonPath.<List<?>>read(body, "$.content").size() >= expected) {
				return body;
			}
			try {
				Thread.sleep(50);
			}
			catch (InterruptedException e) {
				Thread.currentThread().interrupt();
			}
		} while (System.currentTimeMillis() < deadline);
		throw new AssertionError("No notification arrived for " + token);
	}

	private int unreadCount(String token) {
		String body = client.get().uri(NOTIFICATIONS + "/unread-count").header("Authorization", "Bearer " + token)
				.exchange().expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
		return JsonPath.read(body, "$.count");
	}

	private UUID suggestion(String name, UUID contributor) {
		UUID brewery = jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, source, moderation_status)
				VALUES (?, ?, 'FI', 'SEED', 'APPROVED') RETURNING id""", UUID.class, name + " Brewery",
				name + " Brewery");
		return jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, ?, 'IPA', 5.5, 'USER', ?, 'PENDING', ?) RETURNING id""", UUID.class, brewery, name,
				contributor, Timestamp.from(Instant.now()));
	}

}
