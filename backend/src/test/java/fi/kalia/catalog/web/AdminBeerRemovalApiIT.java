package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.BeerRemoved;
import fi.kalia.catalog.SuggestionReviewed;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CopyOnWriteArrayList;
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
 * An admin takes an approved beer down (ADR-0102, ADR-0091): what removal does to the beer and its
 * brewery, what is recorded and published, and what is refused. Rows are inserted straight into the
 * tables so each state is exact.
 */
@Import({TestcontainersConfiguration.class, AdminBeerRemovalApiIT.CommittedEvents.class})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class AdminBeerRemovalApiIT {

	private static final String ADMIN = "Bearer admin-token";

	private static final String MEMBER = "Bearer member-token";

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
		events.removed().clear();
		events.reviewed().clear();
	}

	@Test
	void removingAContributedBeerWithdrawsItLeavesItsBreweryAndRecordsAndPublishesOnce() {
		UUID brewery = brewery("Removal Brewery", "APPROVED", UUID.randomUUID());
		UUID beer = beer(brewery, "Removable Contributed", UUID.randomUUID(), "APPROVED");
		assertThat(searchFinds("Removable Contributed")).isTrue();

		remove(beer, ADMIN).expectStatus().isOk().expectHeader().contentType(MediaType.APPLICATION_JSON)
				.expectBody(String.class).value(body -> {
					assertThat((String) JsonPath.read(body, "$.id")).isEqualTo(beer.toString());
					assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo("REMOVED");
					assertThat((String) JsonPath.read(body, "$.name")).isEqualTo("Removable Contributed");
					assertThat((String) JsonPath.read(body, "$.brewery.id")).isEqualTo(brewery.toString());
					assertThat((String) JsonPath.read(body, "$.breweryStatus")).isEqualTo("APPROVED");
					assertThat(Instant.parse(JsonPath.read(body, "$.decidedAt"))).isNotNull();
					assertThat(body).doesNotContain("\"reason\"");
				});

		assertThat(status("beer", beer)).isEqualTo("REMOVED");
		assertThat(status("brewery", brewery)).as("a removal leaves the brewery as it was").isEqualTo("APPROVED");
		assertThat(searchFinds("Removable Contributed")).isFalse();
		assertThat(breweryListFinds("Removal Brewery")).isTrue();
		client.get().uri("/api/v1/beers/" + beer).header("Authorization", MEMBER).exchange().expectStatus().isNotFound();
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.beer WHERE id = ?", Integer.class, beer)).isEqualTo(1);
		assertThat(jdbc.queryForMap("SELECT decided_by, outcome, reason_code FROM catalog.review WHERE beer_id = ?", beer))
				.containsEntry("decided_by", ADMIN_ID).containsEntry("outcome", "REMOVED")
				.containsEntry("reason_code", null);
		assertThat(reviewCount(beer)).isEqualTo(1);
		assertThat(events.removed()).singleElement().satisfies(event -> {
			assertThat(event.beerId()).isEqualTo(beer);
			assertThat(event.eventId()).isNotNull();
			assertThat(event.occurredAt()).isNotNull();
		});
		assertThat(events.reviewed()).as("a removal is no review of a suggestion, so nobody is notified").isEmpty();
	}

	@Test
	void removingAnImportedBeerWorksAndNamesNoContributor() {
		UUID imported = beer(brewery("Imported Removal Brewery", "APPROVED", null), "Removable Imported", null, "APPROVED");

		remove(imported, ADMIN).expectStatus().isOk().expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.outcome")).isEqualTo("REMOVED"));

		assertThat(status("beer", imported)).isEqualTo("REMOVED");
		assertThat(reviewCount(imported)).isEqualTo(1);
		assertThat(events.removed()).singleElement().satisfies(event -> assertThat(event.beerId()).isEqualTo(imported));
	}

	@Test
	void aRemovedBeerStaysHeldInEveryCellarAndNoRowIsDeletedByARemovalOrARejection() {
		UUID contributor = UUID.randomUUID();
		UUID holder = UUID.randomUUID();
		UUID brewery = brewery("Keeps Rows Brewery", "APPROVED", null);
		UUID removed = beer(brewery, "Kept After Removal", contributor, "APPROVED");
		UUID rejected = beer(brewery, "Kept After Rejection", contributor, "PENDING");
		given(jwtDecoder.decode("holder-token")).willReturn(TestTokens.user(holder.toString(), "holder"));
		for (UUID held : List.of(removed, rejected)) {
			UUID entry = jdbc.queryForObject("INSERT INTO cellar.entry (user_id, beer_id) VALUES (?, ?) RETURNING id",
					UUID.class, holder, held);
			jdbc.update("INSERT INTO cellar.bottle (entry_id, container_type) VALUES (?, 'BOTTLE')", entry);
		}
		long rows = rowCount();

		remove(removed, ADMIN).expectStatus().isOk();
		client.post().uri("/api/v1/admin/suggestions/" + rejected + "/rejection").header("Authorization", ADMIN)
				.contentType(MediaType.APPLICATION_JSON).body("{\"reason\":\"INAPPROPRIATE\"}").exchange()
				.expectStatus().isOk();

		assertThat(rowCount()).as("no catalog row was deleted").isEqualTo(rows);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM cellar.entry WHERE user_id = ?", Integer.class, holder))
				.as("the holder keeps both entries").isEqualTo(2);
		String cellar = client.get().uri("/api/v1/cellar").header("Authorization", "Bearer holder-token").exchange()
				.expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
		assertThat((List<Object>) JsonPath.read(cellar, "$[*].withdrawn")).as("each is flagged, so it renders unlinked")
				.containsExactly(true, true);
		assertThat((List<Object>) JsonPath.read(cellar, "$[*].quantity")).as("the holder keeps the bottles").hasSize(2);
	}

	@Test
	void removingABeerThatIsNotApprovedAnswersAConflictAndPublishesNothing() {
		UUID brewery = brewery("Not Approved Brewery", "APPROVED", null);
		UUID pending = beer(brewery, "Not Yet Approved", UUID.randomUUID(), "PENDING");
		UUID rejected = beer(brewery, "Was Rejected", UUID.randomUUID(), "REJECTED");
		UUID removed = beer(brewery, "Removed Once", UUID.randomUUID(), "APPROVED");
		remove(removed, ADMIN).expectStatus().isOk();
		events.removed().clear();

		for (UUID id : List.of(pending, rejected, removed)) {
			remove(id, ADMIN).expectStatus().isEqualTo(409).expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON)
					.expectBody(String.class).value(body -> {
						assertThat((int) JsonPath.read(body, "$.status")).isEqualTo(409);
						assertThat((String) JsonPath.read(body, "$.moderationStatus"))
								.isEqualTo(status("beer", id));
					});
		}

		assertThat(status("beer", pending)).isEqualTo("PENDING");
		assertThat(status("beer", rejected)).isEqualTo("REJECTED");
		assertThat(status("beer", removed)).isEqualTo("REMOVED");
		assertThat(reviewCount(pending) + reviewCount(rejected)).isZero();
		assertThat(reviewCount(removed)).as("only the first removal was recorded").isEqualTo(1);
		assertThat(events.removed()).isEmpty();
	}

	@Test
	void anUnknownIdAnswersNotFoundAndANonUuidBadRequest() {
		remove(UUID.randomUUID(), ADMIN).expectStatus().isNotFound().expectHeader()
				.contentType(MediaType.APPLICATION_PROBLEM_JSON);
		client.post().uri("/api/v1/admin/beers/not-a-uuid/removal").header("Authorization", ADMIN).exchange()
				.expectStatus().isBadRequest();
		assertThat(events.removed()).isEmpty();
	}

	@Test
	void aNonAdminAndAnAnonymousCallerAreRefusedAndNothingChanges() {
		UUID beer = beer(brewery("Guarded Removal Brewery", "APPROVED", null), "Guarded From Removal", null, "APPROVED");

		remove(beer, MEMBER).expectStatus().isForbidden().expectHeader().contentType(MediaType.APPLICATION_PROBLEM_JSON);
		client.post().uri("/api/v1/admin/beers/" + beer + "/removal").exchange().expectStatus().isUnauthorized();

		assertThat(status("beer", beer)).isEqualTo("APPROVED");
		assertThat(reviewCount(beer)).isZero();
		assertThat(events.removed()).isEmpty();
	}

	@Test
	void theOperationIsInTheSpecWithItsErrors() {
		String docs = client.get().uri("/v3/api-docs").exchange().expectStatus().isOk().returnResult(String.class)
				.getResponseBody();

		assertThat((Map<String, Object>) JsonPath.read(docs, "$.paths['/api/v1/admin/beers/{id}/removal'].post.responses"))
				.containsKeys("200", "400", "401", "403", "404", "409");
	}

	private RestTestClient.ResponseSpec remove(UUID id, String bearer) {
		return client.post().uri("/api/v1/admin/beers/" + id + "/removal").header("Authorization", bearer).exchange();
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

	private long rowCount() {
		return jdbc.queryForObject("SELECT (SELECT count(*) FROM catalog.beer) + (SELECT count(*) FROM catalog.brewery)",
				Long.class);
	}

	private UUID brewery(String name, String status, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, source, contributor_id, moderation_status)
				VALUES (?, ?, 'FI', ?, ?, ?) RETURNING id""", UUID.class,
				name, name, contributor == null ? "SEED" : "USER", contributor, status);
	}

	private UUID beer(UUID brewery, String name, UUID contributor, String status) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, ?, 'IPA', 5.5, ?, ?, ?, ?) RETURNING id""", UUID.class,
				brewery, name, contributor == null ? "SEED" : "USER", contributor, status, Timestamp.from(Instant.now()));
	}

	static class CommittedEvents {

		private final List<BeerRemoved> removed = new CopyOnWriteArrayList<>();

		private final List<SuggestionReviewed> reviewed = new CopyOnWriteArrayList<>();

		List<BeerRemoved> removed() {
			return removed;
		}

		List<SuggestionReviewed> reviewed() {
			return reviewed;
		}

		@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
		void on(BeerRemoved event) {
			removed.add(event);
		}

		@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
		void on(SuggestionReviewed event) {
			reviewed.add(event);
		}

	}

}
