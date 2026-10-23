package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;

import com.jayway.jsonpath.JsonPath;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class CatalogApiIT {

	@Autowired
	private RestTestClient client;

	// The catalog is the migrated one, Wikidata import included, so expected
	// totals and orderings are read from the database rather than pinned.
	@Autowired
	private JdbcTemplate jdbc;

	private long count(String sql) {
		return jdbc.queryForObject(sql, Long.class);
	}

	@Test
	void listsBeersPaginatedAndSortedByNameByDefault() {
		client.get().uri("/api/v1/beers?size=10")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					long total = count("SELECT count(*) FROM catalog.beer");
					assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo((int) total);
					assertThat((int) JsonPath.read(body, "$.totalPages")).isEqualTo((int) ((total + 9) / 10));
					assertThat((int) JsonPath.read(body, "$.page")).isEqualTo(0);
					// The database's collation decides the order, which is what the endpoint promises.
					assertThat((List<String>) JsonPath.read(body, "$.content[*].name"))
							.containsExactlyElementsOf(jdbc.queryForList(
									"SELECT name FROM catalog.beer ORDER BY lower(name), id LIMIT 10", String.class));
				});
	}

	@Test
	void findsBeersByNameQuery() {
		client.get().uri("/api/v1/beers?query=westvleteren")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo(3);
					assertThat((List<String>) JsonPath.read(body, "$.content[*].brewery.name"))
							.containsOnly("Brouwerij Westvleteren");
				});
	}

	@Test
	void filtersQuadsBetweenNineAndTwelvePercent() {
		client.get().uri("/api/v1/beers?style=Quadrupel&minAbv=9&maxAbv=12")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo((int) count(
							"SELECT count(*) FROM catalog.beer WHERE lower(style) = 'quadrupel' AND abv BETWEEN 9 AND 12"));
					assertThat((List<String>) JsonPath.read(body, "$.content[*].style")).isNotEmpty()
							.allSatisfy(style -> assertThat(style).isEqualTo("Quadrupel"));
					List<Double> abvs = JsonPath.read(body, "$.content[*].abv");
					assertThat(abvs).allSatisfy(abv -> assertThat(abv).isBetween(9.0, 12.0));
				});
	}

	@Test
	void filtersByBreweryCountryCode() {
		client.get().uri("/api/v1/beers?countryCode=SE&size=100")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo((int) count("""
							SELECT count(*) FROM catalog.beer b JOIN catalog.brewery br ON br.id = b.brewery_id
							WHERE br.country_code = 'SE'"""));
					assertThat((List<String>) JsonPath.read(body, "$.content[*].brewery.id")).isNotEmpty()
							.isSubsetOf(jdbc.queryForList(
									"SELECT id::text FROM catalog.brewery WHERE country_code = 'SE'", String.class));
				});
	}

	@Test
	void aCountryCodeThatIsNotListedYieldsProblemJson400() {
		for (String unlisted : List.of("XX", "se", "Sweden")) {
			client.get().uri("/api/v1/beers?countryCode={code}", unlisted)
					.exchange()
					.expectStatus().isBadRequest()
					.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
		}
	}

	@Test
	void listsExactlyTheCountriesTheCatalogHasBreweriesIn() {
		client.get().uri("/api/v1/breweries/countries")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$"))
						.containsExactlyInAnyOrderElementsOf(jdbc.queryForList(
								"SELECT DISTINCT country_code FROM catalog.brewery", String.class))
						.contains("SE", "FI"));
	}

	@Test
	void sortsByAbvDescending() {
		client.get().uri("/api/v1/beers?sort=abv,desc&size=1")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((double) JsonPath.read(body, "$.content[0].abv"))
						.isEqualTo(jdbc.queryForObject("SELECT max(abv) FROM catalog.beer", Double.class)));
	}

	@Test
	void sortsByStyleCaseInsensitively() {
		client.get().uri("/api/v1/beers?sort=style,asc&size=100")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((List<String>) JsonPath.read(body, "$.content[*].style"))
						.containsExactlyElementsOf(jdbc.queryForList(
								"SELECT style FROM catalog.beer ORDER BY lower(style), id LIMIT 100", String.class)));

		client.get().uri("/api/v1/beers?sort=style,desc&size=1")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.content[0].style")).isEqualTo(jdbc.queryForObject(
						"SELECT style FROM catalog.beer ORDER BY lower(style) DESC LIMIT 1", String.class)));
	}

	@Test
	void returnsBeerDetailsById() {
		String listBody = client.get().uri("/api/v1/beers?query=Pliny")
				.exchange()
				.expectBody(String.class)
				.returnResult().getResponseBody();
		String id = JsonPath.read(listBody, "$.content[0].id");

		client.get().uri("/api/v1/beers/{id}", id)
				.exchange()
				.expectStatus().isOk()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.name")).isEqualTo("Pliny the Elder");
					assertThat((String) JsonPath.read(body, "$.style")).isEqualTo("Double IPA");
					assertThat((String) JsonPath.read(body, "$.brewery.name")).isEqualTo("Russian River Brewing Company");
					assertThat((String) JsonPath.read(body, "$.brewery.countryCode")).isEqualTo("US");
					assertThat((Map<String, Object>) JsonPath.read(body, "$.brewery")).doesNotContainKey("country");
					assertThat((String) JsonPath.read(body, "$.description")).isNotBlank();
					assertThat(body).doesNotContain("\"price\"");
				});
	}

	@Test
	void batchLookupReturnsTheCorrectBeerForEachRequestedId() {
		String listBody = client.get().uri("/api/v1/beers?style=Quadrupel&size=3")
				.exchange()
				.expectBody(String.class)
				.returnResult().getResponseBody();
		List<String> ids = JsonPath.read(listBody, "$.content[*].id");
		List<String> names = JsonPath.read(listBody, "$.content[*].name");

		client.get().uri("/api/v1/beers/batch?ids={a}&ids={b}", ids.get(0), ids.get(1))
				.exchange()
				.expectStatus().isOk()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((List<String>) JsonPath.read(body, "$[*].id"))
							.containsExactlyInAnyOrder(ids.get(0), ids.get(1));
					assertThat((List<String>) JsonPath.read(body, "$[*].name"))
							.containsExactlyInAnyOrder(names.get(0), names.get(1));
				});
	}

	@Test
	void batchLookupOmitsAnUnknownIdRatherThanReturningNull() {
		String listBody = client.get().uri("/api/v1/beers?query=Pliny")
				.exchange()
				.expectBody(String.class)
				.returnResult().getResponseBody();
		String knownId = JsonPath.read(listBody, "$.content[0].id");

		client.get().uri("/api/v1/beers/batch?ids={known}&ids=00000000-0000-0000-0000-000000000000", knownId)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((List<?>) JsonPath.read(body, "$")).hasSize(1);
					assertThat((String) JsonPath.read(body, "$[0].id")).isEqualTo(knownId);
				});
	}

	@Test
	void batchLookupAboveTheHundredIdCapYieldsProblemJson400() {
		StringBuilder uri = new StringBuilder("/api/v1/beers/batch?");
		for (int i = 0; i < 101; i++) {
			uri.append("ids=").append(UUID.randomUUID()).append('&');
		}
		client.get().uri(uri.toString())
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void batchLookupWithNoIdsYieldsProblemJson400() {
		client.get().uri("/api/v1/beers/batch?ids=")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("ids"));
	}

	@Test
	void unknownBeerIdYieldsProblemJson404() {
		client.get().uri("/api/v1/beers/00000000-0000-0000-0000-000000000000")
				.exchange()
				.expectStatus().isNotFound()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void invalidPaginationYieldsProblemJson400() {
		client.get().uri("/api/v1/beers?size=0")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void pageIndexAboveTheCapYieldsProblemJson400() {
		client.get().uri("/api/v1/beers?page=10001")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void unsupportedSortPropertyYieldsProblemJson400WithGuidance() {
		client.get().uri("/api/v1/beers?sort=price,desc")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.detail"))
						.contains("Unsupported sort property 'price'"));
	}

	@Test
	void sortWithTrailingGarbageYieldsProblemJson400WithGuidance() {
		client.get().uri("/api/v1/beers?sort=name,asc,extra")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.detail"))
						.contains("Malformed sort 'name,asc,extra'"));
	}

	@Test
	void misspelledSortDirectionYieldsProblemJson400InsteadOfSortingAscending() {
		client.get().uri("/api/v1/beers?sort=abv,dsc")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.detail"))
						.contains("Unsupported sort direction 'dsc'"));
	}

	@Test
	void sortDirectionIsAcceptedCaseInsensitively() {
		client.get().uri("/api/v1/beers?sort=abv,ASC&size=1")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((double) JsonPath.read(body, "$.content[0].abv"))
						.isEqualTo(jdbc.queryForObject("SELECT min(abv) FROM catalog.beer", Double.class)));
	}

	@Test
	void abvAboveTheHundredPercentCapYieldsFieldLevelError() {
		client.get().uri("/api/v1/beers?maxAbv=101")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.detail")).isEqualTo("Validation failed");
					assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("maxAbv");
				});
	}

	@Test
	void overlongFreeTextFilterYieldsFieldLevelError() {
		client.get().uri("/api/v1/beers?query=" + "a".repeat(101))
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.detail")).isEqualTo("Validation failed");
					assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("query");
				});
	}

	@Test
	void freeTextFilterAtTheLengthCapIsAccepted() {
		client.get().uri("/api/v1/beers?query=" + "a".repeat(100))
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.totalElements")).isZero());
	}

	@Test
	void invertedAbvRangeYieldsProblemJson400WithGuidance() {
		client.get().uri("/api/v1/beers?minAbv=9&maxAbv=5")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.detail"))
						.contains("minAbv (9)").contains("maxAbv (5)"));
	}

	@Test
	void equalAbvBoundsAreAccepted() {
		client.get().uri("/api/v1/beers?minAbv=9&maxAbv=9")
				.exchange()
				.expectStatus().isOk();
	}

	@Test
	void listsBreweriesPaginatedAndSortedByName() {
		client.get().uri("/api/v1/breweries?size=100")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalElements"))
							.isEqualTo((int) count("SELECT count(*) FROM catalog.brewery"));
					assertThat((int) JsonPath.read(body, "$.page")).isEqualTo(0);
					assertThat((List<String>) JsonPath.read(body, "$.content[*].name")).hasSize(100)
							.isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER);
					assertThat((List<String>) JsonPath.read(body, "$.content[*].countryCode")).hasSize(100);
					assertThat((List<Object>) JsonPath.read(body, "$.content[*].country")).isEmpty();
				});
	}

	@Test
	void breweryListSecondPageContinuesTheSortedSequence() {
		String firstPage = client.get().uri("/api/v1/breweries?page=0&size=8")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
		assertThat((List<?>) JsonPath.read(firstPage, "$.content")).hasSize(8);
		assertThat((int) JsonPath.read(firstPage, "$.totalPages"))
				.isEqualTo((int) ((count("SELECT count(*) FROM catalog.brewery") + 7) / 8));
		String lastOfFirstPage = JsonPath.read(firstPage, "$.content[7].name");

		client.get().uri("/api/v1/breweries?page=1&size=8")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.page")).isEqualTo(1);
					String firstOfSecondPage = JsonPath.read(body, "$.content[0].name");
					assertThat(firstOfSecondPage.compareToIgnoreCase(lastOfFirstPage)).isGreaterThan(0);
				});
	}

	@Test
	void breweryPageIndexPastTheEndYieldsAnEmptyPage() {
		client.get().uri("/api/v1/breweries?page=9000&size=100")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((List<?>) JsonPath.read(body, "$.content")).isEmpty();
					assertThat((int) JsonPath.read(body, "$.totalElements"))
							.isEqualTo((int) count("SELECT count(*) FROM catalog.brewery"));
				});
	}

	@Test
	void breweryPageSizeAboveTheCapYieldsProblemJson400() {
		client.get().uri("/api/v1/breweries?size=101")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void breweryPageIndexAboveTheCapYieldsProblemJson400() {
		client.get().uri("/api/v1/breweries?page=10001")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

}
