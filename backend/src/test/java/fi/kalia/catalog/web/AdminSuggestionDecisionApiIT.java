package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.SuggestionReviewed;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
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
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * An admin's decision on a suggestion (ADR-0102): what each outcome does to the beer and its
 * brewery, what another user then sees, what is refused and how a lost race is answered. Rows
 * are inserted straight into the tables so each state is exact.
 */
@Import({TestcontainersConfiguration.class, AdminSuggestionDecisionApiIT.CommittedEvents.class})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class AdminSuggestionDecisionApiIT {

	private static final String ADMIN = "Bearer admin-token";

	private static final String MEMBER = "Bearer member-token";

	private static final String BASE = "/api/v1/admin/suggestions/";

	private static final UUID ADMIN_ID = UUID.randomUUID();

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private CommittedEvents events;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@BeforeEach
	void setUp() {
		given(jwtDecoder.decode("admin-token")).willReturn(TestTokens.admin(ADMIN_ID.toString(), "admin"));
		given(jwtDecoder.decode("member-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), "member"));
		events.published().clear();
	}

	@Test
	void approvingASuggestionWithAnExistingBreweryMakesTheBeerVisibleToEveryone() {
		UUID brewery = brewery("Existing", "APPROVED", null);
		UUID beer = beer(brewery, "Plain Approval", UUID.randomUUID());
		assertThat(searchFinds("Plain Approval")).isFalse();

		client.post().uri(BASE + beer + "/approval").header("Authorization", ADMIN).exchange()
				.expectStatus().isOk()
				.expectHeader().contentType(MediaType.APPLICATION_JSON)
				.expectBody(String.class).value(body -> {
					assertThat((String) JsonPath.read(body, "$.id")).isEqualTo(beer.toString());
					assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo("APPROVED");
					assertThat((String) JsonPath.read(body, "$.name")).startsWith("Plain Approval");
					assertThat((String) JsonPath.read(body, "$.breweryStatus")).isEqualTo("APPROVED");
					assertThat(Instant.parse(JsonPath.read(body, "$.decidedAt"))).isNotNull();
				});

		assertThat(status("beer", beer)).isEqualTo("APPROVED");
		assertThat(searchFinds("Plain Approval")).isTrue();
		client.get().uri("/api/v1/beers/" + beer).header("Authorization", MEMBER).exchange().expectStatus().isOk();
	}

	@Test
	void approvingASuggestionWithANewBreweryMakesBothVisibleToEveryone() {
		UUID contributor = UUID.randomUUID();
		UUID brewery = brewery("Brand New Approval Brewery", "PENDING", contributor);
		UUID beer = beer(brewery, "New Brewery Approval", contributor);

		client.post().uri(BASE + beer + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();

		assertThat(status("beer", beer)).isEqualTo("APPROVED");
		assertThat(status("brewery", brewery)).isEqualTo("APPROVED");
		assertThat(searchFinds("New Brewery Approval")).isTrue();
		assertThat(breweryListFinds("Brand New Approval Brewery")).isTrue();
	}

	@Test
	void rejectingEachKindWithholdsTheBeerAndTheNewBreweryAndDeletesNothing() {
		UUID contributor = UUID.randomUUID();
		UUID existing = brewery("Kept Open", "APPROVED", null);
		UUID plain = beer(existing, "Rejected Plain", contributor);
		UUID newBrewery = brewery("Rejected Brewery Of Its Own", "PENDING", contributor);
		UUID withNew = beer(newBrewery, "Rejected With New", contributor);

		reject(plain, "INAPPROPRIATE").expectStatus().isOk().expectBody(String.class).value(body -> {
			assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo("REJECTED");
			assertThat((String) JsonPath.read(body, "$.reason")).isEqualTo("INAPPROPRIATE");
			assertThat((String) JsonPath.read(body, "$.breweryStatus")).isEqualTo("APPROVED");
		});
		reject(withNew, "NOT_A_REAL_BEER").expectStatus().isOk().expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.breweryStatus")).isEqualTo("REJECTED"));

		assertThat(status("beer", plain)).isEqualTo("REJECTED");
		assertThat(status("beer", withNew)).isEqualTo("REJECTED");
		assertThat(status("brewery", newBrewery)).isEqualTo("REJECTED");
		assertThat(status("brewery", existing)).isEqualTo("APPROVED");
		assertThat(searchFinds("Rejected Plain")).isFalse();
		assertThat(searchFinds("Rejected With New")).isFalse();
		assertThat(breweryListFinds("Rejected Brewery Of Its Own")).isFalse();
		client.get().uri("/api/v1/beers/" + withNew).header("Authorization", MEMBER).exchange().expectStatus().isNotFound();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.beer WHERE id IN (?, ?)", Integer.class, plain, withNew))
				.isEqualTo(2);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.brewery WHERE id = ?", Integer.class, newBrewery))
				.isEqualTo(1);
	}

	@Test
	void aPendingBreweryTwoSuggestionsShareIsApprovedByTheFirstApproval() {
		UUID contributor = UUID.randomUUID();
		UUID brewery = brewery("Shared Approved First", "PENDING", contributor);
		UUID first = beer(brewery, "Shared One", contributor);
		UUID second = beer(brewery, "Shared Two", contributor);

		client.post().uri(BASE + first + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();
		assertThat(status("brewery", brewery)).isEqualTo("APPROVED");

		reject(second, "INCORRECT_DETAILS").expectStatus().isOk();
		assertThat(status("brewery", brewery)).as("a brewery an approval opened stays open").isEqualTo("APPROVED");
	}

	@Test
	void aSharedPendingBreweryStaysPendingWhileASiblingWaitsAndIsRejectedWithTheLast() {
		UUID contributor = UUID.randomUUID();
		UUID brewery = brewery("Shared Rejected", "PENDING", contributor);
		UUID first = beer(brewery, "Shared Reject One", contributor);
		UUID second = beer(brewery, "Shared Reject Two", contributor);

		reject(first, "ALREADY_IN_CATALOG").expectStatus().isOk().expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.breweryStatus")).isEqualTo("PENDING"));
		assertThat(status("brewery", brewery)).isEqualTo("PENDING");

		reject(second, "ALREADY_IN_CATALOG").expectStatus().isOk();
		assertThat(status("brewery", brewery)).isEqualTo("REJECTED");
	}

	@Test
	void aRejectionNeedsAReasonFromTheListAndAnApprovalTakesNone() {
		UUID beer = beer(brewery("Refusals", "APPROVED", null), "Refusal Target", UUID.randomUUID());

		client.post().uri(BASE + beer + "/rejection").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{}").exchange()
				.expectStatus().isBadRequest().expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON);
		client.post().uri(BASE + beer + "/rejection").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"BECAUSE\"}").exchange()
				.expectStatus().isBadRequest().expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON);
		client.post().uri(BASE + beer + "/rejection").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":null}").exchange()
				.expectStatus().isBadRequest();
		client.post().uri(BASE + beer + "/approval").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"INAPPROPRIATE\"}").exchange()
				.expectStatus().isBadRequest().expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON);

		assertThat(status("beer", beer)).as("a refused request changes nothing").isEqualTo("PENDING");
		assertThat(reviewCount(beer)).isZero();
	}

	@Test
	void aDecisionWritesOneReviewRecordWithWhoWhenOutcomeAndReason() {
		UUID approved = beer(brewery("Records", "APPROVED", null), "Recorded Approval", UUID.randomUUID());
		UUID rejected = beer(brewery("Records Too", "APPROVED", null), "Recorded Rejection", UUID.randomUUID());

		client.post().uri(BASE + approved + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();
		reject(rejected, "NOT_A_REAL_BEER").expectStatus().isOk();

		Map<String, Object> approval = jdbc.queryForMap("SELECT * FROM catalog.review WHERE beer_id = ?", approved);
		assertThat(approval).containsEntry("decided_by", ADMIN_ID).containsEntry("outcome", "APPROVED");
		assertThat(approval.get("reason_code")).isNull();
		assertThat(approval.get("decided_at")).isNotNull();
		Map<String, Object> rejection = jdbc.queryForMap("SELECT * FROM catalog.review WHERE beer_id = ?", rejected);
		assertThat(rejection).containsEntry("decided_by", ADMIN_ID).containsEntry("outcome", "REJECTED")
				.containsEntry("reason_code", "NOT_A_REAL_BEER");
	}

	@Test
	void theDecidingAdminColumnIsNullableAndAReasonBelongsToARejectionAlone() {
		assertThat(jdbc.queryForObject("""
				SELECT is_nullable FROM information_schema.columns
				WHERE table_schema = 'catalog' AND table_name = 'review' AND column_name = 'decided_by'""",
				String.class)).isEqualTo("YES");
		UUID beer = beer(brewery("Schema Check", "APPROVED", null), "Schema Target", UUID.randomUUID());

		jdbc.update("INSERT INTO catalog.review (beer_id, decided_by, outcome, decided_at) VALUES (?, NULL, 'APPROVED', now())",
				beer);

		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO catalog.review (beer_id, outcome, reason_code, decided_at)
				VALUES (?, 'APPROVED', 'INAPPROPRIATE', now())""", beer))
				.hasMessageContaining("review_check");
		assertThatThrownBy(() -> jdbc.update("""
				INSERT INTO catalog.review (beer_id, outcome, decided_at) VALUES (?, 'REJECTED', now())""", beer))
				.hasMessageContaining("review_check");
	}

	@Test
	void decidingADecidedSuggestionAnswersAConflictSayingHowItWasDecidedAndWhen() {
		UUID approved = beer(brewery("Conflicts", "APPROVED", null), "Already Approved", UUID.randomUUID());
		UUID rejected = beer(brewery("Conflicts Too", "APPROVED", null), "Already Rejected", UUID.randomUUID());
		client.post().uri(BASE + approved + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();
		reject(rejected, "INAPPROPRIATE").expectStatus().isOk();

		client.post().uri(BASE + approved + "/rejection").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"INAPPROPRIATE\"}").exchange()
				.expectStatus().isEqualTo(409).expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class).value(body -> {
					assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo("APPROVED");
					assertThat(Instant.parse(JsonPath.read(body, "$.decidedAt"))).isNotNull();
				});
		client.post().uri(BASE + rejected + "/approval").header("Authorization", ADMIN).exchange()
				.expectStatus().isEqualTo(409).expectBody(String.class).value(body -> {
					assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo("REJECTED");
					assertThat((int) JsonPath.read(body, "$.status")).isEqualTo(409);
					assertThat(Instant.parse(JsonPath.read(body, "$.decidedAt"))).isNotNull();
				});
		assertThat(reviewCount(approved)).isEqualTo(1);
	}

	@Test
	void aSuggestionTheScriptDecidedIsAConflictWithNoTime() {
		UUID beer = beer(brewery("Scripted", "APPROVED", null), "Scripted Beer", UUID.randomUUID());
		jdbc.update("UPDATE catalog.beer SET moderation_status = 'APPROVED' WHERE id = ?", beer);

		client.post().uri(BASE + beer + "/approval").header("Authorization", ADMIN).exchange()
				.expectStatus().isEqualTo(409).expectBody(String.class).value(body -> {
					assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo("APPROVED");
					assertThat(body).doesNotContain("decidedAt");
				});
	}

	@Test
	void anUnknownIdAndAnImportedBeerAnswerNotFound() {
		UUID imported = jdbc.queryForObject("SELECT id FROM catalog.beer WHERE contributor_id IS NULL LIMIT 1", UUID.class);

		for (UUID id : List.of(UUID.randomUUID(), imported)) {
			client.post().uri(BASE + id + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isNotFound();
			reject(id, "INAPPROPRIATE").expectStatus().isNotFound();
		}
		assertThat(status("beer", imported)).isEqualTo("APPROVED");
	}

	@Test
	void aNonAdminAndAnAnonymousCallerAreRefusedAndNothingChanges() {
		UUID beer = beer(brewery("Refused Callers", "APPROVED", null), "Guarded Beer", UUID.randomUUID());

		for (String operation : List.of("/approval", "/rejection")) {
			client.post().uri(BASE + beer + operation).header("Authorization", MEMBER)
					.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"INAPPROPRIATE\"}").exchange()
					.expectStatus().isForbidden().expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON);
			client.post().uri(BASE + beer + operation).exchange().expectStatus().isUnauthorized();
		}
		assertThat(status("beer", beer)).isEqualTo("PENDING");
	}

	@Test
	void twoConcurrentDecisionsLeaveOneDecisionOneRecordOneEventAndTheLoserAConflict() throws Exception {
		UUID contributor = UUID.randomUUID();
		UUID brewery = brewery("Racing Brewery", "PENDING", contributor);
		UUID beer = beer(brewery, "Racing Beer", contributor);
		CyclicBarrier together = new CyclicBarrier(2);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<Integer> approve = pool.submit(() -> {
				together.await(10, TimeUnit.SECONDS);
				return client.post().uri(BASE + beer + "/approval").header("Authorization", ADMIN).exchange()
						.returnResult(String.class).getStatus().value();
			});
			Future<Integer> rejectNew = pool.submit(() -> {
				together.await(10, TimeUnit.SECONDS);
				return reject(beer, "INAPPROPRIATE").returnResult(String.class).getStatus().value();
			});

			assertThat(List.of(approve.get(30, TimeUnit.SECONDS), rejectNew.get(30, TimeUnit.SECONDS)))
					.containsExactlyInAnyOrder(200, 409);
		}
		finally {
			pool.shutdownNow();
		}

		String decided = status("beer", beer);
		assertThat(decided).isIn("APPROVED", "REJECTED");
		assertThat(status("brewery", brewery)).isEqualTo(decided);
		assertThat(reviewCount(beer)).isEqualTo(1);
		assertThat(events.published()).filteredOn(event -> event.beerId().equals(beer)).hasSize(1);
		client.post().uri(BASE + beer + "/approval").header("Authorization", ADMIN).exchange()
				.expectStatus().isEqualTo(409).expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo(decided));
	}

	@Test
	void everyDecisionPublishesOneEventWhetherOrNotItsBreweryWasNew() {
		UUID contributor = UUID.randomUUID();
		UUID plain = beer(brewery("Evented Existing", "APPROVED", null), "Evented Plain", contributor);
		UUID newBrewery = brewery("Evented New", "PENDING", contributor);
		UUID withNew = beer(newBrewery, "Evented With New", contributor);

		client.post().uri(BASE + plain + "/approval").header("Authorization", ADMIN).exchange().expectStatus().isOk();
		reject(withNew, "INCORRECT_DETAILS").expectStatus().isOk();

		assertThat(events.published()).extracting(SuggestionReviewed::beerId).containsExactlyInAnyOrder(plain, withNew);
		assertThat(events.published()).filteredOn(event -> event.beerId().equals(withNew)).singleElement()
				.satisfies(event -> {
					assertThat(event.outcome()).isEqualTo(SuggestionReviewed.Outcome.REJECTED);
					assertThat(event.contributorId()).isEqualTo(contributor);
				});
	}

	@Test
	void theOperationsAreInTheSpecWithTheirErrors() {
		String docs = client.get().uri("/v3/api-docs").exchange().expectStatus().isOk().returnResult(String.class)
				.getResponseBody();
		for (String path : List.of("/api/v1/admin/suggestions/{id}/approval", "/api/v1/admin/suggestions/{id}/rejection")) {
			assertThat((Map<String, Object>) JsonPath.read(docs, "$.paths['" + path + "'].post.responses"))
					.containsKeys("200", "400", "401", "403", "404", "409");
		}
	}

	private RestTestClient.ResponseSpec reject(UUID id, String reason) {
		return client.post().uri(BASE + id + "/rejection").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"" + reason + "\"}").exchange();
	}

	private boolean searchFinds(String name) {
		List<String> names = new ArrayList<>();
		client.get().uri(uri -> uri.path("/api/v1/beers").queryParam("query", name).build())
				.header("Authorization", MEMBER).exchange().expectStatus().isOk()
				.expectBody(String.class).value(body -> names.addAll(JsonPath.read(body, "$.content[*].name")));
		return names.stream().anyMatch(found -> found.startsWith(name));
	}

	private boolean breweryListFinds(String name) {
		List<String> names = new ArrayList<>();
		client.get().uri(uri -> uri.path("/api/v1/breweries").queryParam("query", name).build())
				.header("Authorization", MEMBER).exchange().expectStatus().isOk()
				.expectBody(String.class).value(body -> names.addAll(JsonPath.read(body, "$.content[*].name")));
		return names.stream().anyMatch(found -> found.startsWith(name));
	}

	private String status(String table, UUID id) {
		return jdbc.queryForObject("SELECT moderation_status FROM catalog." + table + " WHERE id = ?", String.class, id);
	}

	private int reviewCount(UUID beer) {
		return jdbc.queryForObject("SELECT count(*) FROM catalog.review WHERE beer_id = ?", Integer.class, beer);
	}

	private UUID brewery(String name, String status, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, source, contributor_id, moderation_status)
				VALUES (?, ?, 'FI', ?, ?, ?) RETURNING id""", UUID.class,
				name, name, contributor == null ? "SEED" : "USER", contributor, status);
	}

	private UUID beer(UUID brewery, String name, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, ?, 'IPA', 5.5, 'USER', ?, 'PENDING', ?) RETURNING id""", UUID.class,
				brewery, name, contributor, Timestamp.from(Instant.now()));
	}

	static class CommittedEvents {

		private final List<SuggestionReviewed> published = new CopyOnWriteArrayList<>();

		List<SuggestionReviewed> published() {
			return published;
		}

		@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
		void on(SuggestionReviewed event) {
			published.add(event);
		}

	}

}
