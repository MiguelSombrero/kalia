package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
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
 * The admin's read of the review queue (ADR-0102): what is listed, in what
 * order, who may ask, and what a suggestion carries. Rows are inserted straight
 * into the tables so each state a suggestion can be in is exact.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class AdminSuggestionApiIT {

	private static final String ADMIN = "Bearer admin-token";

	private static final String MEMBER = "Bearer member-token";

	private static final String LIST = "/api/v1/admin/suggestions";

	private static final Instant T0 = Instant.parse("2026-01-01T10:00:00Z");

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@BeforeEach
	void setUp() {
		given(jwtDecoder.decode("admin-token")).willReturn(TestTokens.admin(UUID.randomUUID().toString(), "admin"));
		given(jwtDecoder.decode("member-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), "member"));
		// The context, and so the database, is shared with other suites that leave suggestions waiting.
		jdbc.update("UPDATE catalog.beer SET moderation_status = 'REMOVED' WHERE moderation_status = 'PENDING'");
	}

	@Test
	void theQueueIsOldestFirstAndEachSuggestionNamesItsBreweryItsNewnessAndItsContributor() {
		UUID publicContributor = contributor("alice", true);
		UUID privateContributor = contributor("bob", false);
		UUID noProfile = UUID.randomUUID();
		UUID newBrewery = brewery("Panimo Uusi", "FI", "Tampere", "PENDING", publicContributor);
		UUID oldBrewery = brewery("Brouwerij Oud", "BE", null, "APPROVED", null);
		UUID third = beer(oldBrewery, "Third", noProfile, "PENDING", T0.plusSeconds(30));
		UUID first = beer(newBrewery, "First", publicContributor, "PENDING", T0);
		UUID second = beer(oldBrewery, "Second", privateContributor, "PENDING", T0.plusSeconds(10));

		client.get().uri(LIST).header("Authorization", ADMIN).exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((List<String>) JsonPath.read(body, "$.content[*].id"))
							.containsExactly(first.toString(), second.toString(), third.toString());
					assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo(3);
					assertThat((int) JsonPath.read(body, "$.page")).isZero();
					assertThat((String) JsonPath.read(body, "$.content[0].name")).startsWith("First");
					assertThat((String) JsonPath.read(body, "$.content[0].style")).isEqualTo("IPA");
					assertThat((double) JsonPath.read(body, "$.content[0].abv")).isEqualTo(5.5);
					assertThat((String) JsonPath.read(body, "$.content[0].suggestedAt"))
							.isEqualTo("2026-01-01T10:00:00Z");
					assertThat((String) JsonPath.read(body, "$.content[0].brewery.id")).isEqualTo(newBrewery.toString());
					assertThat((String) JsonPath.read(body, "$.content[0].brewery.name")).startsWith("Panimo Uusi");
					assertThat((String) JsonPath.read(body, "$.content[0].brewery.countryCode")).isEqualTo("FI");
					assertThat((String) JsonPath.read(body, "$.content[0].brewery.city")).isEqualTo("Tampere");
					assertThat((boolean) JsonPath.read(body, "$.content[0].breweryIsNew")).isTrue();
					assertThat((boolean) JsonPath.read(body, "$.content[1].breweryIsNew")).isFalse();
					assertThat((String) JsonPath.read(body, "$.content[0].contributor.username")).startsWith("alice");
					assertThat((String) JsonPath.read(body, "$.content[1].contributor.username"))
							.as("a private cellar does not keep an admin from naming the contributor")
							.startsWith("bob");
					assertThat((java.util.Map<String, Object>) JsonPath.read(body, "$.content[2].contributor"))
							.as("no profile row: listed, with no username").doesNotContainKey("username");
					assertThat((java.util.Map<String, Object>) JsonPath.read(body, "$.content[0].contributor"))
							.as("the contributor's id is not served, only the username").containsOnlyKeys("username",
									"pendingCount", "rejectedCount");
					assertThat(body).doesNotContain("contributorId");
				});
	}

	@Test
	void pagesNeverRepeatOrDropSuggestionsAddedInTheSameInstant() {
		UUID contributor = contributor("carol", false);
		UUID brewery = brewery("Panimo", "FI", null, "APPROVED", null);
		List<String> ids = new ArrayList<>();
		for (int i = 0; i < 5; i++) {
			ids.add(beer(brewery, "Same instant " + i, contributor, "PENDING", T0).toString());
		}
		// The text of a UUID sorts as the database orders them, which UUID.compareTo does not.
		ids.sort(Comparator.naturalOrder());

		List<String> seen = new ArrayList<>();
		for (int page = 0; page < 3; page++) {
			client.get().uri(LIST + "?page={page}&size=2", page).header("Authorization", ADMIN).exchange()
					.expectStatus().isOk()
					.expectBody(String.class)
					.value(body -> {
						assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo(5);
						assertThat((int) JsonPath.read(body, "$.totalPages")).isEqualTo(3);
						seen.addAll(JsonPath.read(body, "$.content[*].id"));
					});
		}

		assertThat(seen).containsExactlyElementsOf(ids);
	}

	@Test
	void aDecidedBeerAndAPendingOneWithNoContributorAreNotInTheQueue() {
		UUID contributor = contributor("dave", false);
		UUID brewery = brewery("Panimo", "FI", null, "APPROVED", null);
		UUID waiting = beer(brewery, "Waiting", contributor, "PENDING", T0);
		beer(brewery, "Approved", contributor, "APPROVED", T0);
		beer(brewery, "Rejected", contributor, "REJECTED", T0);
		beer(brewery, "Removed", contributor, "REMOVED", T0);
		beer(brewery, "Nobody's", null, "PENDING", T0);

		client.get().uri(LIST).header("Authorization", ADMIN).exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.content[*].id"))
						.containsExactly(waiting.toString()));
	}

	@Test
	void aSuggestionIsReadByItsBeersIdWithTheSameFieldsAsItsListing() {
		UUID contributor = contributor("erin", true);
		UUID newBrewery = brewery("Panimo Uusi", "FI", null, "PENDING", contributor);
		UUID id = beer(newBrewery, "Only", contributor, "PENDING", T0);

		client.get().uri(LIST + "/{id}", id).header("Authorization", ADMIN).exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.id")).isEqualTo(id.toString());
					assertThat((String) JsonPath.read(body, "$.name")).startsWith("Only");
					assertThat((boolean) JsonPath.read(body, "$.breweryIsNew")).isTrue();
					assertThat((String) JsonPath.read(body, "$.contributor.username")).startsWith("erin");
					assertThat((int) JsonPath.read(body, "$.contributor.pendingCount")).isEqualTo(1);
				});
	}

	@Test
	void readingAnythingThatIsNotWaitingAnswers404() {
		UUID contributor = contributor("frank", false);
		UUID brewery = brewery("Panimo", "FI", null, "APPROVED", null);
		UUID imported = jdbc.queryForObject("SELECT id FROM catalog.beer WHERE source = 'WIKIDATA' LIMIT 1", UUID.class);
		List<UUID> notWaiting = List.of(imported, UUID.randomUUID(),
				beer(brewery, "Approved", contributor, "APPROVED", T0),
				beer(brewery, "Rejected", contributor, "REJECTED", T0),
				beer(brewery, "Removed", contributor, "REMOVED", T0),
				beer(brewery, "Nobody's", null, "PENDING", T0));

		for (UUID id : notWaiting) {
			client.get().uri(LIST + "/{id}", id).header("Authorization", ADMIN).exchange()
					.expectStatus().isNotFound()
					.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
		}
	}

	@Test
	void eachSuggestionCarriesItsContributorsPendingAndRejectedCounts() {
		UUID busy = contributor("gina", false);
		UUID other = contributor("hugo", false);
		UUID brewery = brewery("Panimo", "FI", null, "APPROVED", null);
		UUID first = beer(brewery, "Busy one", busy, "PENDING", T0);
		UUID second = beer(brewery, "Busy two", busy, "PENDING", T0.plusSeconds(1));
		beer(brewery, "Busy rejected", busy, "REJECTED", T0);
		beer(brewery, "Busy rejected again", busy, "REJECTED", T0);
		beer(brewery, "Busy removed", busy, "REMOVED", T0);
		beer(brewery, "Busy approved", busy, "APPROVED", T0);
		UUID third = beer(brewery, "Other", other, "PENDING", T0.plusSeconds(2));
		beer(brewery, "Other rejected", other, "REJECTED", T0);

		client.get().uri(LIST).header("Authorization", ADMIN).exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((List<String>) JsonPath.read(body, "$.content[*].id"))
							.containsExactly(first.toString(), second.toString(), third.toString());
					assertThat((List<Integer>) JsonPath.read(body, "$.content[*].contributor.pendingCount"))
							.containsExactly(2, 2, 1);
					assertThat((List<Integer>) JsonPath.read(body, "$.content[*].contributor.rejectedCount"))
							.containsExactly(2, 2, 1);
				});
		client.get().uri(LIST + "/{id}", second).header("Authorization", ADMIN).exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.contributor.pendingCount")).isEqualTo(2);
					assertThat((int) JsonPath.read(body, "$.contributor.rejectedCount")).isEqualTo(2);
				});
	}

	@Test
	void everyParameterIsBounded() {
		for (String query : List.of("page=-1", "size=0", "size=101", "page=10001", "page=101&size=100", "size=x")) {
			client.get().uri(LIST + "?" + query).header("Authorization", ADMIN).exchange()
					.expectStatus().isBadRequest()
					.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
		}
		client.get().uri(LIST + "/not-a-uuid").header("Authorization", ADMIN).exchange()
				.expectStatus().isBadRequest();
	}

	@Test
	void aCallerWhoIsNotAnAdminIsRefusedBothOperations() {
		UUID contributor = contributor("ida", false);
		UUID brewery = brewery("Panimo", "FI", null, "APPROVED", null);
		UUID id = beer(brewery, "Waiting", contributor, "PENDING", T0);

		for (String uri : List.of(LIST, LIST + "/" + id)) {
			client.get().uri(uri).header("Authorization", MEMBER).exchange()
					.expectStatus().isForbidden()
					.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
			client.get().uri(uri).exchange()
					.expectStatus().isUnauthorized()
					.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
		}
	}

	@Test
	void theSpecListsBothOperationsUnderTheirOwnTagWithTheirRefusals() {
		String docs = new String(client.get().uri("/v3/api-docs").exchange().expectStatus().isOk()
				.expectBody().returnResult().getResponseBody());

		for (String path : List.of("/api/v1/admin/suggestions", "/api/v1/admin/suggestions/{id}")) {
			assertThat((List<String>) JsonPath.read(docs, "$.paths['" + path + "'].get.tags"))
					.containsExactly("Admin suggestions");
			assertThat((java.util.Map<String, Object>) JsonPath.read(docs, "$.paths['" + path + "'].get.responses"))
					.containsKeys("200", "401", "403");
			assertThat((List<Object>) JsonPath.read(docs, "$.paths['" + path + "'].get.security")).isNotEmpty();
		}
		assertThat((java.util.Map<String, Object>) JsonPath.read(docs,
				"$.paths['/api/v1/admin/suggestions/{id}'].get.responses")).containsKeys("400", "404");
		assertThat((java.util.Map<String, Object>) JsonPath.read(docs,
				"$.paths['/api/v1/admin/suggestions'].get.responses")).containsKey("400");
	}

	private UUID contributor(String username, boolean cellarPublic) {
		UUID id = UUID.randomUUID();
		jdbc.update("INSERT INTO profile.profile (id, username, cellar_public) VALUES (?, ?, ?)",
				id, username + "-" + id, cellarPublic);
		return id;
	}

	private UUID brewery(String name, String countryCode, String city, String status, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, city, contributor_id, moderation_status)
				VALUES (?, ?, ?, ?, ?, ?) RETURNING id""", UUID.class,
				name + " " + UUID.randomUUID(), name, countryCode, city, contributor, status);
	}

	private UUID beer(UUID brewery, String name, UUID contributor, String status, Instant createdAt) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, ?, 'IPA', 5.5, 'USER', ?, ?, ?) RETURNING id""", UUID.class,
				brewery, name + " " + UUID.randomUUID(), contributor, status, Timestamp.from(createdAt));
	}

}
