package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.catalog.application.ContributionService;
import java.io.IOException;
import java.nio.file.Path;
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
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * A contributed catalog entry waits for an operator (ADR-0091), across the
 * catalog, the cellar and the feed, and is never deleted. The operator command
 * is the real {@code scripts/moderate-contributor.sql}, run through {@code psql}
 * in the test database's own container.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ContributionModerationIT {

	private static final String CONTRIBUTOR = "Bearer contributor-token";

	private static final String OTHER = "Bearer other-token";

	private static final String ANONYMOUS = "";

	private static final String STYLE = "Quadrupel";

	private static final String SCRIPT = "/tmp/moderate-contributor.sql";

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private PostgreSQLContainer postgres;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID contributorId;

	private String contributorName;

	private UUID otherId;

	private UUID westvleteren;

	@BeforeEach
	void setUp() throws IOException, InterruptedException {
		contributorId = UUID.randomUUID();
		contributorName = "contributor-" + UUID.randomUUID();
		otherId = UUID.randomUUID();
		given(jwtDecoder.decode("contributor-token"))
				.willReturn(TestTokens.user(contributorId.toString(), contributorName));
		given(jwtDecoder.decode("other-token")).willReturn(TestTokens.user(otherId.toString(), "other-" + otherId));
		westvleteren = jdbc.queryForObject(
				"SELECT id FROM catalog.brewery WHERE name = 'Brouwerij Westvleteren'", UUID.class);
		postgres.copyFileToContainer(
				MountableFile.forHostPath(Path.of("..", "scripts", "moderate-contributor.sql").toAbsolutePath()), SCRIPT);
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
	void aPendingBeerIsCellaredByItsContributorButHeldFromThePublicCellarAndTheFeedUntilApproved() {
		String beerName = uniqueName("Sahti");
		String beerId = JsonPath.read(add(CONTRIBUTOR, newBreweryBeer(beerName, uniqueName("Panimo"))).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		setCellarPublic(CONTRIBUTOR);
		addBottle(CONTRIBUTOR, beerId).expectStatus().isCreated();
		awaitFeedLine(contributorId);

		assertThat(cellarBeerIds(CONTRIBUTOR)).as("the owner's own cellar").containsExactly(beerId);
		assertThat(publicCellarBeerIds()).as("the public cellar").isEmpty();
		assertThat(feedBeerIds()).as("the anonymous feed").doesNotContain(beerId);

		moderate("approve");

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

		moderate("approve");

		page = publicCellar("size=2&page=0");
		assertThat(contentIds(page)).containsExactly(firstPending, approved.get(0));
		assertThat((int) JsonPath.read(page, "$.totalElements")).isEqualTo(4);
		assertThat((int) JsonPath.read(page, "$.totalPages")).isEqualTo(2);
		assertThat((int) JsonPath.read(page, "$.totalBottles")).isEqualTo(4);
		assertThat(Instant.parse(JsonPath.read(page, "$.lastBottleAddedAt"))).isEqualTo(bottleAddedAt(lastPending));
		assertThat(contentIds(publicCellar("size=2&page=1"))).containsExactly(approved.get(1), lastPending);

		moderate("remove");

		page = publicCellar("size=2&page=0");
		assertThat(contentIds(page)).as("a removed beer is left out of a public cellar").containsExactly(approved.get(0),
				approved.get(1));
		assertThat((int) JsonPath.read(page, "$.totalElements")).isEqualTo(2);
		assertThat((int) JsonPath.read(page, "$.totalBottles")).isEqualTo(2);
	}

	@Test
	void aContributorAtThePendingCapIsRefusedWithAProblemUntilSomeAreReviewed() {
		for (int added = 0; added < ContributionService.MAX_PENDING_ENTRIES; added++) {
			add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
		}

		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren))
				.expectStatus().isEqualTo(429)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.status")).isEqualTo(429);
					assertThat((String) JsonPath.read(body, "$.detail")).contains("waiting for review");
				});
		add(OTHER, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();

		moderate("approve");

		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
	}

	@Test
	void aNewBreweryCountsAsAnEntryOfItsOwnTowardsTheCap() {
		for (int added = 0; added < ContributionService.MAX_PENDING_ENTRIES - 1; added++) {
			add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
		}

		add(CONTRIBUTOR, newBreweryBeer(uniqueName("Sahti"), uniqueName("Panimo"))).expectStatus().isEqualTo(429);

		assertThat(pendingCount(contributorId)).isEqualTo(ContributionService.MAX_PENDING_ENTRIES - 1);
		add(CONTRIBUTOR, existingBreweryBeer(uniqueName("Abt"), westvleteren)).expectStatus().isCreated();
	}

	@Test
	void aRejectedBeerIsHiddenButItsRowStaysAndItsOwnersCellarAndTheFeedStillRender() {
		String beerName = uniqueName("Sahti");
		String beerId = JsonPath.read(add(CONTRIBUTOR, newBreweryBeer(beerName, uniqueName("Panimo"))).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		setCellarPublic(CONTRIBUTOR);
		addBottle(CONTRIBUTOR, beerId).expectStatus().isCreated();
		awaitFeedLine(contributorId);
		long rows = rowCount();

		moderate("reject");

		assertHiddenButKept(beerId, beerName, rows);
		assertThat(statusOf(beerId)).isEqualTo("REJECTED");
	}

	@Test
	void aRemovedBeerIsHiddenButItsRowStaysAndItsOwnersCellarAndTheFeedStillRender() {
		String beerName = uniqueName("Sahti");
		String beerId = JsonPath.read(add(CONTRIBUTOR, newBreweryBeer(beerName, uniqueName("Panimo"))).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		setCellarPublic(CONTRIBUTOR);
		moderate("approve");
		addBottle(CONTRIBUTOR, beerId).expectStatus().isCreated();
		awaitFeedLine(contributorId);
		assertThat(searchIds(ANONYMOUS, beerName)).containsExactly(beerId);
		long rows = rowCount();

		moderate("remove");

		assertHiddenButKept(beerId, beerName, rows);
		assertThat(statusOf(beerId)).isEqualTo("REMOVED");
	}

	@Test
	void aHiddenBeerCannotBeCellaredAndItsNameCanBeProposedAgain() {
		String beerName = uniqueName("Sahti");
		UUID breweryId = westvleteren;
		String beerId = JsonPath.read(add(CONTRIBUTOR, existingBreweryBeer(beerName, breweryId)).expectStatus()
				.isCreated().expectBody(String.class).returnResult().getResponseBody(), "$.id");
		moderate("reject");

		addBottle(CONTRIBUTOR, beerId).expectStatus().isNotFound();
		String again = add(OTHER, existingBreweryBeer(beerName, breweryId)).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody();

		assertThat((String) JsonPath.read(again, "$.id")).isNotEqualTo(beerId);
	}

	@Test
	void theOperatorCommandReviewsOnlyTheNamedContributorsEntriesInTheStatesItNames() {
		String approvedByName = uniqueName("Abt");
		String rejectedName = uniqueName("Abt");
		String removedName = uniqueName("Abt");
		String othersName = uniqueName("Abt");
		add(OTHER, existingBreweryBeer(othersName, westvleteren)).expectStatus().isCreated();
		setCellarPublic(CONTRIBUTOR);

		add(CONTRIBUTOR, newBreweryBeer(approvedByName, uniqueName("Panimo"))).expectStatus().isCreated();
		ExecResult approved = moderate("approve", contributorId.toString());
		assertThat(approved.getStderr()).contains("1 beers and 1 breweries now APPROVED");
		assertThat(statusOfBeerNamed(approvedByName)).isEqualTo("APPROVED");
		assertThat(statusOfBeerNamed(othersName)).as("another contributor's").isEqualTo("PENDING");

		add(CONTRIBUTOR, existingBreweryBeer(rejectedName, westvleteren)).expectStatus().isCreated();
		moderate("reject", contributorName.toUpperCase());
		assertThat(statusOfBeerNamed(rejectedName)).isEqualTo("REJECTED");
		assertThat(statusOfBeerNamed(approvedByName)).as("reject leaves approved rows alone").isEqualTo("APPROVED");

		add(CONTRIBUTOR, existingBreweryBeer(removedName, westvleteren)).expectStatus().isCreated();
		moderate("remove", contributorName);
		assertThat(statusOfBeerNamed(removedName)).isEqualTo("REMOVED");
		assertThat(statusOfBeerNamed(approvedByName)).as("remove takes down approved rows").isEqualTo("REMOVED");
		assertThat(statusOfBeerNamed(rejectedName)).as("a rejected row stays rejected").isEqualTo("REJECTED");
		assertThat(statusOfBeerNamed(othersName)).as("another contributor's").isEqualTo("PENDING");
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.brewery WHERE contributor_id = ? AND moderation_status = 'REMOVED'",
				Long.class, contributorId)).isEqualTo(1);
	}

	@Test
	void theOperatorCommandRefusesAnUnknownActionOrContributorAndChangesNothing() {
		String name = uniqueName("Abt");
		add(CONTRIBUTOR, existingBreweryBeer(name, westvleteren)).expectStatus().isCreated();

		assertThat(moderate("delete", contributorName).getExitCode()).isNotZero();
		assertThat(moderate("approve", "nobody-" + UUID.randomUUID()).getExitCode()).isNotZero();
		assertThat(moderate("approve", "not a user or an id").getExitCode()).isNotZero();

		assertThat(statusOfBeerNamed(name)).isEqualTo("PENDING");
	}

	private void assertHiddenButKept(String beerId, String beerName, long rowsBefore) {
		assertThat(rowCount()).as("no catalog row was deleted").isEqualTo(rowsBefore);
		for (String viewer : List.of(CONTRIBUTOR, OTHER, ANONYMOUS)) {
			assertThat(searchIds(viewer, beerName)).as("search as '%s'", viewer).isEmpty();
			get(viewer, "/api/v1/beers/" + beerId).expectStatus().isNotFound();
		}
		assertThat(cellarBeerIds(CONTRIBUTOR)).as("the owner's cellar").containsExactly(beerId);
		assertThat(publicCellarBeerIds()).as("the public cellar").isEmpty();
		assertThat(feedBeerIds()).as("the feed").contains(beerId);
	}

	private void moderate(String action) {
		ExecResult result = moderate(action, contributorId.toString());
		assertThat(result.getExitCode()).as(result.getStderr()).isZero();
	}

	private ExecResult moderate(String action, String who) {
		try {
			return postgres.execInContainer("psql", "-U", postgres.getUsername(), "-d", postgres.getDatabaseName(),
					"-v", "action=" + action, "-v", "who=" + who, "-f", SCRIPT);
		} catch (IOException | InterruptedException e) {
			throw new IllegalStateException(e);
		}
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

	private List<String> breweryIds(String bearer, String name) {
		return ids(get(bearer, "/api/v1/breweries?query={name}", name), "$.content[*].id");
	}

	private List<String> cellarBeerIds(String bearer) {
		return ids(get(bearer, "/api/v1/cellar"), "$[*].beer.id");
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

	private long pendingCount(UUID contributor) {
		return jdbc.queryForObject("""
				SELECT (SELECT count(*) FROM catalog.beer WHERE contributor_id = ? AND moderation_status = 'PENDING')
				     + (SELECT count(*) FROM catalog.brewery WHERE contributor_id = ? AND moderation_status = 'PENDING')""",
				Long.class, contributor, contributor);
	}

	private String statusOf(String beerId) {
		return jdbc.queryForObject("SELECT moderation_status FROM catalog.beer WHERE id = ?", String.class,
				UUID.fromString(beerId));
	}

	private String statusOfBeerNamed(String name) {
		return jdbc.queryForObject("SELECT moderation_status FROM catalog.beer WHERE name = ?", String.class, name);
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
