package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class AddBeerApiIT {

	private static final String BEARER = "Bearer contributor-token";

	private static final String STYLE = "Quadrupel";

	@Autowired
	private RestTestClient client;

	// The catalog is the migrated one, Wikidata import included, so ids and
	// names are read from the database rather than pinned.
	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private UUID contributorId;

	private UUID westvleteren;

	@BeforeEach
	void setUp() {
		contributorId = UUID.randomUUID();
		given(jwtDecoder.decode("contributor-token"))
				.willReturn(TestTokens.user(contributorId.toString(), "contributor"));
		westvleteren = jdbc.queryForObject(
				"SELECT id FROM catalog.brewery WHERE name = 'Brouwerij Westvleteren'", UUID.class);
	}

	@Test
	void anAddedBeerAppearsInItsContributorsSearchAndDetail() {
		String name = uniqueName("Abt");
		UUID id = idOf(addBeer(beer(name, STYLE, 10.5).withBrewery(westvleteren)).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody());

		client.get().uri("/api/v1/beers?query={name}", name)
				.header("Authorization", BEARER)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.content[*].id"))
						.containsExactly(id.toString()));

		client.get().uri("/api/v1/beers/{id}", id)
				.header("Authorization", BEARER)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.name")).isEqualTo(name);
					assertThat((String) JsonPath.read(body, "$.style")).isEqualTo(STYLE);
					assertThat((double) JsonPath.read(body, "$.abv")).isEqualTo(10.5);
					assertThat((String) JsonPath.read(body, "$.brewery.id")).isEqualTo(westvleteren.toString());
				});
	}

	@Test
	void anAddedBeerRecordsItsContributorAndIsMarkedUserAdded() {
		UUID id = idOf(addBeer(beer(uniqueName("Abt"), STYLE, 10.5).withBrewery(westvleteren))
				.expectStatus().isCreated().expectBody(String.class).returnResult().getResponseBody());

		assertThat(jdbc.queryForMap("SELECT source, contributor_id, wikidata_qid FROM catalog.beer WHERE id = ?", id))
				.containsEntry("source", "USER")
				.containsEntry("contributor_id", contributorId)
				.containsEntry("wikidata_qid", null);
	}

	// One test for both halves, so opening the catalog to writes cannot
	// silently close it to readers, nor opening it to readers open it to writes.
	@Test
	void anAnonymousAddIsRefusedWhileCatalogReadsAnswerAnonymously() {
		client.post().uri("/api/v1/beers")
				.contentType(MediaType.APPLICATION_JSON)
				.body(beer(uniqueName("Abt"), STYLE, 10.5).withBrewery(westvleteren).body)
				.exchange()
				.expectStatus().isUnauthorized();

		UUID anyBeer = jdbc.queryForObject("SELECT id FROM catalog.beer LIMIT 1", UUID.class);
		for (String uri : List.of("/api/v1/beers?size=1", "/api/v1/beers/" + anyBeer,
				"/api/v1/breweries?query=vleteren", "/api/v1/styles",
				"/api/v1/countries", "/api/v1/breweries/countries")) {
			client.get().uri(uri).exchange().expectStatus().isOk();
		}
	}

	@Test
	void aDuplicateOfAnImportedBeerIsRefusedWithTheExistingBeersId() {
		Map<String, Object> imported = jdbc.queryForMap("""
				SELECT id, name, brewery_id FROM catalog.beer
				WHERE source = 'WIKIDATA' AND name ~ '^[A-Za-z0-9 ]+$' ORDER BY name LIMIT 1""");
		String variant = "  " + ((String) imported.get("name")).toUpperCase(Locale.ROOT) + ".";

		addBeer(beer(variant, STYLE, 5.0).withBrewery((UUID) imported.get("brewery_id")))
				.expectStatus().isEqualTo(409)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.existingBeerId"))
						.isEqualTo(imported.get("id").toString()));
	}

	@Test
	void aDuplicateOfAUserAddedBeerDifferingOnlyInCaseWhitespaceOrPunctuationIsRefused() {
		String name = uniqueName("Abt Twelve");
		UUID id = idOf(addBeer(beer(name, STYLE, 10.5).withBrewery(westvleteren)).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody());

		for (String variant : List.of(name, name.toLowerCase(Locale.ROOT), " " + name.replace(" ", "   ") + " ",
				name.replace(" ", "-") + "!")) {
			addBeer(beer(variant, STYLE, 10.5).withBrewery(westvleteren))
					.expectStatus().isEqualTo(409)
					.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
					.expectBody(String.class)
					.value(body -> assertThat((String) JsonPath.read(body, "$.existingBeerId"))
							.isEqualTo(id.toString()));
		}

		assertThat(jdbc.queryForObject(
				"SELECT count(*) FROM catalog.beer WHERE brewery_id = ? AND catalog.fold_name(name) = catalog.fold_name(?)",
				Long.class, westvleteren, name)).isEqualTo(1);
	}

	@Test
	void aFullwidthTwinOfAnExistingNameIsADuplicate() {
		String name = uniqueName("Abt Twelve");
		UUID id = idOf(addBeer(beer(name, STYLE, 10.5).withBrewery(westvleteren)).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody());

		addBeer(beer(fullwidth(name), STYLE, 10.5).withBrewery(westvleteren))
				.expectStatus().isEqualTo(409)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.existingBeerId")).isEqualTo(id.toString()));

		String breweryName = uniqueName("Panimo");
		UUID breweryId = UUID.fromString(JsonPath.read(addBeer(beer(uniqueName("Sahti"), STYLE, 8.0)
				.withNewBrewery(breweryName, "FI", null)).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody(), "$.brewery.id"));
		addBeer(beer(uniqueName("Sahti"), STYLE, 8.0).withNewBrewery(fullwidth(breweryName), "FI", null))
				.expectStatus().isEqualTo(409)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.existingBreweryId"))
						.isEqualTo(breweryId.toString()));
	}

	// A zero-width twin is refused before the duplicate check can see it: the 400 is the defence.
	@Test
	void aNameWithAnInvisibleOrBidiFormattingCharacterIsRefusedWhereverItAppears() {
		for (String invisible : List.of("\u200B", "\u200D", "\u202E", "\u2066", "\u2069", "\uFEFF", "\u00AD")) {
			addBeer(beer("Abt" + invisible + " Twelve", STYLE, 10.0).withBrewery(westvleteren))
					.expectStatus().isBadRequest()
					.expectBody(String.class)
					.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
							.as("beer name with U+%04X", (int) invisible.charAt(0)).containsExactly("name"));
			addBeer(beer(uniqueName("Abt"), STYLE, 10.0).withNewBrewery("Pani" + invisible + "mo", "FI", null))
					.expectStatus().isBadRequest()
					.expectBody(String.class)
					.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
							.containsExactly("newBrewery.name"));
			addBeer(beer(uniqueName("Abt"), STYLE, 10.0).withNewBrewery(uniqueName("Panimo"), "FI", "Lah" + invisible + "ti"))
					.expectStatus().isBadRequest()
					.expectBody(String.class)
					.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
							.containsExactly("newBrewery.city"));
		}
	}

	@Test
	void aBeerWithANewBreweryCreatesTheBreweryAndADuplicateBreweryIsRefused() {
		String breweryName = uniqueName("Panimo");
		String body = addBeer(beer(uniqueName("Sahti"), STYLE, 8.0)
				.withNewBrewery(breweryName, "FI", "  Lahti ")).expectStatus().isCreated()
				.expectBody(String.class).returnResult().getResponseBody();
		UUID breweryId = UUID.fromString(JsonPath.read(body, "$.brewery.id"));

		assertThat(jdbc.queryForMap(
				"SELECT name, country_code, city, source, contributor_id FROM catalog.brewery WHERE id = ?", breweryId))
				.containsEntry("name", breweryName)
				.containsEntry("country_code", "FI")
				.containsEntry("city", "Lahti")
				.containsEntry("source", "USER")
				.containsEntry("contributor_id", contributorId);

		addBeer(beer(uniqueName("Sahti"), STYLE, 8.0)
				.withNewBrewery(breweryName.toUpperCase(Locale.ROOT) + ".", "FI", null))
				.expectStatus().isEqualTo(409)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(problem -> assertThat((String) JsonPath.read(problem, "$.existingBreweryId"))
						.isEqualTo(breweryId.toString()));

		// The same name in another country is another brewery.
		addBeer(beer(uniqueName("Sahti"), STYLE, 8.0).withNewBrewery(breweryName, "EE", null))
				.expectStatus().isCreated();
	}

	@Test
	void aStyleTheCatalogLacksOrAMissingAbvIsRefused() {
		addBeer(beer(uniqueName("Abt"), "Imaginary Ale", 6.0).withBrewery(westvleteren))
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
						.containsExactly("style"));

		Request missingAbv = beer(uniqueName("Abt"), STYLE, 6.0).withBrewery(westvleteren);
		missingAbv.body.remove("abv");
		addBeer(missingAbv)
				.expectStatus().isBadRequest()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
						.containsExactly("abv"));
	}

	@Test
	void styleMatchingIgnoresCaseAndStoresTheCatalogsSpelling() {
		String body = addBeer(beer(uniqueName("Abt"), "  quadrupel ", 10.5).withBrewery(westvleteren))
				.expectStatus().isCreated().expectBody(String.class).returnResult().getResponseBody();

		assertThat((String) JsonPath.read(body, "$.style")).isEqualTo(STYLE);
	}

	@Test
	void noCatalogReadResponseCarriesTheContributor() {
		String breweryName = uniqueName("Leak Check");
		String created = addBeer(beer(uniqueName("Abt"), STYLE, 10.5).withNewBrewery(breweryName, "FI", null))
				.expectStatus().isCreated().expectBody(String.class).returnResult().getResponseBody();
		UUID id = idOf(created);

		List<String> reads = List.of(
				created,
				read("/api/v1/beers?query=" + JsonPath.read(created, "$.name")),
				read("/api/v1/beers/" + id),
				read("/api/v1/breweries?query=" + breweryName));

		assertThat(reads).allSatisfy(body -> assertThat(body)
				.contains(breweryName)
				.doesNotContainIgnoringCase("contributor")
				.doesNotContain(contributorId.toString()));
	}

	@Test
	void breweriesAreFoundByNameAndStylesAndCountriesListed() {
		client.get().uri("/api/v1/breweries?query=VLETEREN")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((List<String>) JsonPath.read(body, "$.content[*].id")).contains(westvleteren.toString());
					assertThat((List<String>) JsonPath.read(body, "$.content[*].name"))
							.allSatisfy(name -> assertThat(name).containsIgnoringCase("vleteren"));
				});

		client.get().uri("/api/v1/styles")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$"))
						.containsExactlyInAnyOrderElementsOf(
								jdbc.queryForList("SELECT DISTINCT style FROM catalog.beer", String.class))
						.isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER));

		client.get().uri("/api/v1/countries")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$"))
						.hasSize(249).contains("FI", "US"));
	}

	@Test
	void invalidAndOutOfRangeFieldsAreRefusedListingEachViolation() {
		Request invalid = beer("!!!", "x".repeat(101), 100.1).withNewBrewery("", "FI", "c".repeat(101));

		addBeer(invalid)
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
						.containsOnly("name", "style", "abv", "newBrewery.name", "newBrewery.city"));

		addBeer(beer(uniqueName("Abt"), STYLE, 6.55).withBrewery(westvleteren))
				.expectStatus().isBadRequest()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
						.containsExactly("abv"));

		addBeer(beer(uniqueName("Abt"), STYLE, -0.1).withBrewery(westvleteren))
				.expectStatus().isBadRequest();

		addBeer(beer("Abt\t12", STYLE, 10.0).withBrewery(westvleteren))
				.expectStatus().isBadRequest()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].message"))
						.containsExactly("must not contain control or invisible formatting characters"));

		addBeer(beer(uniqueName("Abt"), STYLE, 6.0).withBrewery(westvleteren)
				.withNewBrewery(uniqueName("Both"), "FI", null))
				.expectStatus().isBadRequest()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
						.containsExactly("breweryId"));

		addBeer(beer(uniqueName("Abt"), STYLE, 6.0))
				.expectStatus().isBadRequest()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
						.containsExactly("breweryId"));

		for (String unlisted : List.of("Finland", "fi", "XX")) {
			addBeer(beer(uniqueName("Abt"), STYLE, 6.0).withNewBrewery(uniqueName("Panimo"), unlisted, null))
					.expectStatus().isBadRequest()
					.expectBody(String.class)
					.value(body -> assertThat((List<String>) JsonPath.read(body, "$.errors[*].field"))
							.as(unlisted).containsExactly("newBrewery.countryCode"));
		}
	}

	@Test
	void aBreweryIdTheCatalogLacksIsNotFound() {
		addBeer(beer(uniqueName("Abt"), STYLE, 6.0).withBrewery(UUID.randomUUID()))
				.expectStatus().isNotFound()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void anAddedBeerCanImmediatelyBeAddedToACellar() {
		UUID id = idOf(addBeer(beer(uniqueName("Abt"), STYLE, 10.5).withBrewery(westvleteren))
				.expectStatus().isCreated().expectBody(String.class).returnResult().getResponseBody());

		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", BEARER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("beerId", id.toString(), "containerType", "BOTTLE"))
				.exchange()
				.expectStatus().isCreated();

		client.get().uri("/api/v1/cellar")
				.header("Authorization", BEARER)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$[*].beer.id"))
						.containsExactly(id.toString()));
	}

	private RestTestClient.ResponseSpec addBeer(Request request) {
		return client.post().uri("/api/v1/beers")
				.header("Authorization", BEARER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request.body)
				.exchange();
	}

	private String read(String uri) {
		return client.get().uri(uri)
				.header("Authorization", BEARER)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

	private static String fullwidth(String text) {
		StringBuilder twin = new StringBuilder();
		text.chars().forEach(c -> twin.appendCodePoint(c == ' ' ? 0x3000 : c >= '!' && c <= '~' ? c + 0xFEE0 : c));
		return twin.toString();
	}

	private static UUID idOf(String body) {
		return UUID.fromString(JsonPath.read(body, "$.id"));
	}

	// Rows this class adds outlive each test, so names never repeat.
	private static String uniqueName(String prefix) {
		return prefix + " " + UUID.randomUUID().toString().substring(0, 8);
	}

	private static Request beer(String name, String style, double abv) {
		Map<String, Object> body = new LinkedHashMap<>();
		body.put("name", name);
		body.put("style", style);
		body.put("abv", abv);
		return new Request(body);
	}

	private record Request(Map<String, Object> body) {

		Request withBrewery(UUID breweryId) {
			body.put("breweryId", breweryId.toString());
			return this;
		}

		Request withNewBrewery(String name, String countryCode, String city) {
			Map<String, Object> brewery = new LinkedHashMap<>();
			brewery.put("name", name);
			brewery.put("countryCode", countryCode);
			brewery.put("city", city);
			body.put("newBrewery", brewery);
			return this;
		}

	}

}
