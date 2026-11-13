package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.catalog.application.ContributionService;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * A contributed catalog entry waits for an admin (ADR-0091, ADR-0102), across the catalog, the
 * cellar and the feed, and is never deleted. Every decision here goes through the admin API.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ContributedBeerLifecycleIT {

	private static final String CONTRIBUTOR = "Bearer contributor-token";

	private static final String OTHER = "Bearer other-token";

	private static final String ADMIN = "Bearer admin-token";

	private static final String ANONYMOUS = "";

	private static final String STYLE = "Quadrupel";

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID contributorId;

	private String contributorName;

	private UUID otherId;

	private UUID westvleteren;

	@BeforeEach
	void setUp() {
		contributorId = UUID.randomUUID();
		contributorName = "contributor-" + UUID.randomUUID();
		otherId = UUID.randomUUID();
		given(jwtDecoder.decode("contributor-token"))
				.willReturn(TestTokens.user(contributorId.toString(), contributorName));
		given(jwtDecoder.decode("other-token")).willReturn(TestTokens.user(otherId.toString(), "other-" + otherId));
		given(jwtDecoder.decode("admin-token")).willReturn(TestTokens.admin(UUID.randomUUID().toString(), "admin"));
		westvleteren = jdbc.queryForObject(
				"SELECT id FROM catalog.brewery WHERE name = 'Brouwerij Westvleteren'", UUID.class);
	}

	@Test
	void aPendingBeerAndItsNewBreweryAreVisibleToTheirContributorAlone() {
		String breweryName = uniqueName("Panimo");
		String beerName = uniqueName("Sahti");
		String created = add(CONTRIBUTOR, newBreweryBeer(beerName, breweryName)).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody();
		String beerId = JsonPath.read(created, "$.id");
		String breweryId = JsonPath.read(created, "$.brewery.id");

		assertThat(searchIds(CONTRIBUTOR, beerName)).containsExactly(beerId);
		assertThat(breweryIds(CONTRIBUTOR, breweryName)).containsExactly(breweryId);
		get(CONTRIBUTOR, "/api/v1/beers/" + beerId).expectStatus().isOk();

		for (String viewer : List.of(OTHER, ANONYMOUS)) {
			assertThat(searchIds(viewer, beerName)).as("search as '%s'", viewer).isEmpty();
			assertThat(breweryIds(viewer, breweryName)).as("brewery list as '%s'", viewer).isEmpty();
			get(viewer, "/api/v1/beers/" + beerId).expectStatus().isNotFound();
		}
		assertThat(searchIds(OTHER, null, breweryId)).as("a brewery's beers").isEmpty();
		add(OTHER, existingBreweryBeer(uniqueName("Abt"), UUID.fromString(breweryId))).expectStatus().isNotFound();
		addBottle(OTHER, beerId).expectStatus().isNotFound();
	}

	@Test
	void theSearchAndTheDetailsReportAPendingBeerToItsContributorAndAnApprovedOneToEveryReader() {
		String beerName = uniqueName("Sahti");
		String created = add(CONTRIBUTOR, newBreweryBeer(beerName, uniqueName("Panimo"))).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody();
		String beerId = JsonPath.read(created, "$.id");
		String approvedId = jdbc.queryForObject(
				"SELECT id::text FROM catalog.beer WHERE moderation_status = 'APPROVED' LIMIT 1", String.class);

		assertThat((String) JsonPath.read(created, "$.status")).as("the beer just added").isEqualTo("PENDING");
		assertThat(searchStatuses(CONTRIBUTOR, "$.content[?(@.id == '" + beerId + "')].status", beerName))
				.as("search as its contributor").containsExactly("PENDING");
		assertThat(detailsStatus(CONTRIBUTOR, beerId)).as("details as its contributor").isEqualTo("PENDING");
		assertThat(detailsStatus(CONTRIBUTOR, approvedId)).isEqualTo("APPROVED");
		for (String reader : List.of(CONTRIBUTOR, OTHER, ANONYMOUS)) {
			assertThat(searchStatuses(reader, "$.content[*].status", null)).as("a page of search as '%s'", reader)
					.isNotEmpty().containsOnly("APPROVED");
			assertThat(detailsStatus(reader, approvedId)).as("details as '%s'", reader).isEqualTo("APPROVED");
		}

		approve(beerId);

		assertThat(searchStatuses(ANONYMOUS, "$.content[?(@.id == '" + beerId + "')].status", beerName))
				.containsExactly("APPROVED");
		for (String reader : List.of(CONTRIBUTOR, OTHER, ANONYMOUS)) {
			assertThat(detailsStatus(reader, beerId)).as("details as '%s' once approved", reader).isEqualTo("APPROVED");
		}
	}

	@Test
	void noReaderButTheContributorEverReceivesPendingFromASearchOrTheDetails() {
		String beerName = uniqueName("Sahti");
		String beerId = addedBeerId(newBreweryBeer(beerName, uniqueName("Panimo")));

		for (String reader : List.of(OTHER, ANONYMOUS)) {
			assertThat(searchStatuses(reader, "$.content[*].status", beerName)).as("search as '%s'", reader).isEmpty();
			get(reader, "/api/v1/beers/" + beerId).expectStatus().isNotFound();
		}
	}

	@Test
	void aPendingBeerIsCellaredByItsContributorButHeldFromThePublicCellarAndTheFeedUntilApproved() {
		String beerName = uniqueName("Sahti");
		String beerId = JsonPath.read(add(CONTRIBUTOR, newBreweryBeer(beerName, uniqueName("Panimo"))).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		setCellarPublic(CONTRIBUTOR);
		addBottle(CONTRIBUTOR, beerId).expectStatus().isCreated();
		awaitFeedLine(contributorId);

		assertThat(cellarBeerIds(CONTRIBUTOR)).as("the owner's own cellar").containsExactly(beerId);
		assertThat(cellarValues("$[*].withdrawn")).as("a pending beer is not withdrawn").containsExactly(false);
		assertThat(publicCellarBeerIds()).as("the public cellar").isEmpty();
		assertThat(feedBeerIds()).as("the anonymous feed").doesNotContain(beerId);

		approve(beerId);

		assertThat(publicCellarBeerIds()).containsExactly(beerId);
		assertThat(feedBeerIds()).contains(beerId);
		assertThat(searchIds(ANONYMOUS, beerName)).containsExactly(beerId);
		get(ANONYMOUS, "/api/v1/beers/" + beerId).expectStatus().isOk();
	}

	@Test
	void aPublicCellarPagesAndTotalsOnlyWhatTheReaderIsShownAndCountsABeerFromTheMomentItIsApproved() {
		String firstPending = addedBeerId(newBreweryBeer(uniqueName("Sahti"), uniqueName("Panimo")));
		List<String> approved = jdbc.queryForList(
				"SELECT id::text FROM catalog.beer WHERE moderation_status = 'APPROVED' ORDER BY id LIMIT 2", String.class);
		String lastPending = addedBeerId(existingBreweryBeer(uniqueName("Abt"), westvleteren));
		setCellarPublic(CONTRIBUTOR);
		for (String beerId : List.of(firstPending, approved.get(0), approved.get(1), lastPending)) {
			addBottle(CONTRIBUTOR, beerId).expectStatus().isCreated();
		}
		Instant lastApprovedBottle = bottleAddedAt(approved.get(1));

		String page = publicCellar("size=2&page=0");
		assertThat(contentIds(page)).as("a full page, though the first beer added is pending").containsExactlyElementsOf(approved);
		assertThat((int) JsonPath.read(page, "$.totalElements")).isEqualTo(2);
		assertThat((int) JsonPath.read(page, "$.totalPages")).isEqualTo(1);
		assertThat((int) JsonPath.read(page, "$.totalBottles")).isEqualTo(2);
		assertThat(Instant.parse(JsonPath.read(page, "$.lastBottleAddedAt"))).isEqualTo(lastApprovedBottle);

		approve(firstPending);
		approve(lastPending);

		page = publicCellar("size=2&page=0");
		assertThat(contentIds(page)).containsExactly(firstPending, approved.get(0));
		assertThat((int) JsonPath.read(page, "$.totalElements")).isEqualTo(4);
		assertThat((int) JsonPath.read(page, "$.totalPages")).isEqualTo(2);
		assertThat((int) JsonPath.read(page, "$.totalBottles")).isEqualTo(4);
		assertThat(Instant.parse(JsonPath.read(page, "$.lastBottleAddedAt"))).isEqualTo(bottleAddedAt(lastPending));
		assertThat(contentIds(publicCellar("size=2&page=1"))).containsExactly(approved.get(1), lastPending);

		remove(firstPending);
		remove(lastPending);

		page = publicCellar("size=2&page=0");
		assertThat(contentIds(page)).as("a removed beer is left out of a public cellar").containsExactly(approved.get(0),
				approved.get(1));
		assertThat((int) JsonPath.read(page, "$.totalElements")).isEqualTo(2);
		assertThat((int) JsonPath.read(page, "$.totalBottles")).isEqualTo(2);
	}

	@Test
	void aContributorAtThePendingCapIsRefusedWithAProblemUntilSomeAreReviewed() {
		String first = addedBeerId(existingBreweryBeer(uniqueName("Abt"), westvleteren));
		for (int added = 1; added < ContributionService.MAX_PENDING_ENTRIES; added++) {
			add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
		}

		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren))
				.expectStatus().isEqualTo(429)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.status")).isEqualTo(429);
					assertThat((String) JsonPath.read(body, "$.detail")).contains("suggestions waiting for review");
				});
		add(OTHER, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();

		approve(first);

		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
	}

	@Test
	void aBeerWithANewBreweryCountsOnceTowardsTheCap() {
		int half = ContributionService.MAX_PENDING_ENTRIES / 2;
		for (int added = 0; added < half; added++) {
			add(CONTRIBUTOR, newBreweryBeer(uniqueName("Sahti"), uniqueName("Panimo"))).expectStatus().isCreated();
		}
		for (int added = 0; added < half; added++) {
			add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
		}

		assertThat(pendingSuggestions(contributorId)).isEqualTo(ContributionService.MAX_PENDING_ENTRIES);
		add(CONTRIBUTOR, newBreweryBeer(uniqueName("Sahti"), uniqueName("Panimo"))).expectStatus().isEqualTo(429);
		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isEqualTo(429);
		assertThat(pendingSuggestions(contributorId)).isEqualTo(ContributionService.MAX_PENDING_ENTRIES);
	}

	@Test
	void rejectionsLimitNothingAMoreRoomOpensWhenASuggestionIsRejected() {
		String first = addedBeerId(existingBreweryBeer(uniqueName("Abt"), westvleteren));
		for (int added = 1; added < ContributionService.MAX_PENDING_ENTRIES; added++) {
			add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
		}
		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isEqualTo(429);

		reject(first);

		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
	}

	@Test
	void aRejectedBeerIsWithheldEverywhereButItsRowAndItsHoldersBottlesStay() {
		String beerName = uniqueName("Sahti");
		String beerId = JsonPath.read(add(CONTRIBUTOR, newBreweryBeer(beerName, uniqueName("Panimo"))).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		setCellarPublic(CONTRIBUTOR);
		addBottle(CONTRIBUTOR, beerId).expectStatus().isCreated();
		awaitFeedLine(contributorId);
		long rows = rowCount();

		reject(beerId);

		assertHiddenButKept(beerId, beerName, rows);
		assertThat(statusOf(beerId)).isEqualTo("REJECTED");
	}

	@Test
	void aRemovedBeerIsWithheldEverywhereButItsRowAndItsHoldersBottlesStay() {
		String beerName = uniqueName("Sahti");
		String beerId = JsonPath.read(add(CONTRIBUTOR, newBreweryBeer(beerName, uniqueName("Panimo"))).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		setCellarPublic(CONTRIBUTOR);
		approve(beerId);
		addBottle(CONTRIBUTOR, beerId).expectStatus().isCreated();
		awaitFeedLine(contributorId);
		assertThat(searchIds(ANONYMOUS, beerName)).containsExactly(beerId);
		long rows = rowCount();

		remove(beerId);

		assertHiddenButKept(beerId, beerName, rows);
		assertThat(statusOf(beerId)).isEqualTo("REMOVED");
	}

	@Test
	void aHiddenBeerCannotBeCellaredAndItsNameCanBeProposedAgain() {
		String beerName = uniqueName("Sahti");
		UUID breweryId = westvleteren;
		String beerId = JsonPath.read(add(CONTRIBUTOR, existingBreweryBeer(beerName, breweryId)).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		reject(beerId);

		addBottle(CONTRIBUTOR, beerId).expectStatus().isNotFound();
		String again = add(OTHER, existingBreweryBeer(beerName, breweryId)).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody();

		assertThat((String) JsonPath.read(again, "$.id")).isNotEqualTo(beerId);
	}

	private void assertHiddenButKept(String beerId, String beerName, long rowsBefore) {
		assertThat(rowCount()).as("no catalog row was deleted").isEqualTo(rowsBefore);
		for (String viewer : List.of(CONTRIBUTOR, OTHER, ANONYMOUS)) {
			assertThat(searchIds(viewer, beerName)).as("search as '%s'", viewer).isEmpty();
			get(viewer, "/api/v1/beers/" + beerId).expectStatus().isNotFound();
		}
		assertThat(cellarBeerIds(CONTRIBUTOR)).as("the owner's cellar").containsExactly(beerId);
		assertThat(cellarValues("$[*].withdrawn")).as("flagged withdrawn").containsExactly(true);
		assertThat(cellarValues("$[*].quantity")).as("the holder keeps the bottle").containsExactly(1);
		assertThat(publicCellarBeerIds()).as("the public cellar").isEmpty();
		assertThat(feedBeerIds()).as("the feed").doesNotContain(beerId);
		addBottle(CONTRIBUTOR, beerId).expectStatus().isNotFound();
		assertThat(cellarValues("$[*].quantity")).as("the refused add changed nothing").containsExactly(1);
	}

	private void approve(String beerId) {
		decide(beerId, "/approval", null);
	}

	private void reject(String beerId) {
		decide(beerId, "/rejection", Map.of("reason", "INAPPROPRIATE"));
	}

	private void decide(String beerId, String operation, Map<String, Object> body) {
		RestTestClient.RequestBodySpec request = client.post().uri("/api/v1/admin/suggestions/" + beerId + operation)
				.header("Authorization", ADMIN).contentType(MediaType.APPLICATION_JSON);
		(body == null ? request : request.body(body)).exchange().expectStatus().isOk();
	}

	private void remove(String beerId) {
		client.post().uri("/api/v1/admin/beers/" + beerId + "/removal").header("Authorization", ADMIN).exchange()
				.expectStatus().isOk();
	}

	private RestTestClient.ResponseSpec add(String bearer, Map<String, Object> body) {
		return client.post().uri("/api/v1/beers")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(body)
				.exchange();
	}

	private RestTestClient.ResponseSpec addBottle(String bearer, String beerId) {
		return client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("beerId", beerId, "containerType", "BOTTLE"))
				.exchange();
	}

	private void setCellarPublic(String bearer) {
		client.method(HttpMethod.PATCH).uri("/api/v1/profile/visibility")
				.header("Authorization", bearer)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("cellarPublic", true))
				.exchange()
				.expectStatus().isOk();
	}

	private RestTestClient.ResponseSpec get(String bearer, String uri, Object... variables) {
		RestTestClient.RequestHeadersSpec<?> request = client.get().uri(uri, variables);
		if (!bearer.isEmpty()) {
			request = request.header("Authorization", bearer);
		}
		return request.exchange();
	}

	private List<String> searchIds(String bearer, String name) {
		return searchIds(bearer, name, null);
	}

	private List<String> searchIds(String bearer, String name, String breweryId) {
		return ids(get(bearer, "/api/v1/beers?query={name}&breweryId={breweryId}", name == null ? "" : name,
				breweryId == null ? "" : breweryId), "$.content[*].id");
	}

	private List<String> searchStatuses(String bearer, String path, String name) {
		String body = get(bearer, "/api/v1/beers?query={name}&size=50", name == null ? "" : name).expectStatus().isOk()
				.expectBody(String.class).returnResult().getResponseBody();
		return JsonPath.read(body, path);
	}

	private String detailsStatus(String bearer, String beerId) {
		String body = get(bearer, "/api/v1/beers/" + beerId).expectStatus().isOk().expectBody(String.class)
				.returnResult().getResponseBody();
		return JsonPath.read(body, "$.status");
	}

	private List<String> breweryIds(String bearer, String name) {
		return ids(get(bearer, "/api/v1/breweries?query={name}", name), "$.content[*].id");
	}

	private List<String> cellarBeerIds(String bearer) {
		return ids(get(bearer, "/api/v1/cellar"), "$[*].beer.id");
	}

	private List<Object> cellarValues(String path) {
		String body = get(CONTRIBUTOR, "/api/v1/cellar").expectStatus().isOk().expectBody(String.class).returnResult()
				.getResponseBody();
		return JsonPath.read(body, path);
	}

	private String addedBeerId(Map<String, Object> body) {
		return JsonPath.read(add(CONTRIBUTOR, body).expectStatus().isCreated().expectBody(String.class).returnResult()
				.getResponseBody(), "$.id");
	}

	private String publicCellar(String query) {
		return get(ANONYMOUS, "/api/v1/cellars/" + contributorName + "?" + query).expectStatus().isOk()
				.expectBody(String.class).returnResult().getResponseBody();
	}

	private static List<String> contentIds(String body) {
		return JsonPath.read(body, "$.content[*].beer.id");
	}

	private Instant bottleAddedAt(String beerId) {
		return jdbc.queryForObject("""
				SELECT max(b.created_at) FROM cellar.bottle b JOIN cellar.entry e ON e.id = b.entry_id
				WHERE e.user_id = ? AND e.beer_id = ?""", Timestamp.class, contributorId, UUID.fromString(beerId)).toInstant();
	}

	private List<String> publicCellarBeerIds() {
		return ids(get(ANONYMOUS, "/api/v1/cellars/" + contributorName), "$.content[*].beer.id");
	}

	private List<String> feedBeerIds() {
		return ids(get(ANONYMOUS, "/api/v1/feed?size=99"), "$.content[?(@.username == '" + contributorName + "')].beerId");
	}

	private static List<String> ids(RestTestClient.ResponseSpec response, String path) {
		String body = response.expectStatus().isOk().expectBody(String.class).returnResult().getResponseBody();
		return JsonPath.read(body, path);
	}

	// The cellar publishes the event and the feed records it on its own thread.
	private void awaitFeedLine(UUID userId) {
		await().atMost(Duration.ofSeconds(10)).until(() -> jdbc.queryForObject(
				"SELECT count(*) FROM feed.line WHERE user_id = ?", Long.class, userId) == 1);
	}

	private long rowCount() {
		return jdbc.queryForObject("SELECT (SELECT count(*) FROM catalog.beer) + (SELECT count(*) FROM catalog.brewery)",
				Long.class);
	}

	private long pendingSuggestions(UUID contributor) {
		return jdbc.queryForObject(
				"SELECT count(*) FROM catalog.beer WHERE contributor_id = ? AND moderation_status = 'PENDING'", Long.class,
				contributor);
	}

	private String statusOf(String beerId) {
		return jdbc.queryForObject("SELECT moderation_status FROM catalog.beer WHERE id = ?", String.class,
				UUID.fromString(beerId));
	}

	// Rows this class adds outlive each test, so names never repeat.
	private static String uniqueName(String prefix) {
		return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
	}

	private static Map<String, Object> existingBreweryBeer(String name, UUID breweryId) {
		Map<String, Object> body = beer(name);
		body.put("breweryId", breweryId.toString());
		return body;
	}

	private static Map<String, Object> newBreweryBeer(String name, String breweryName) {
		Map<String, Object> body = beer(name);
		body.put("newBrewery", Map.of("name", breweryName, "countryCode", "FI"));
		return body;
	}

	private static Map<String, Object> beer(String name) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("name", name);
		body.put("style", STYLE);
		body.put("abv", 8.0);
		return body;
	}

}
