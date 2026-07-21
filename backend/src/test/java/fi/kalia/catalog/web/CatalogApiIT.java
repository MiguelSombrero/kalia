package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

import com.jayway.jsonpath.JsonPath;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class CatalogApiIT {

	@Autowired
	private RestTestClient client;

	@Test
	void listsBeersPaginatedAndSortedByNameByDefault() {
		client.get().uri("/api/v1/beers?size=10")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo(54);
					assertThat((int) JsonPath.read(body, "$.totalPages")).isEqualTo(6);
					assertThat((int) JsonPath.read(body, "$.page")).isEqualTo(0);
					assertThat((java.util.List<?>) JsonPath.read(body, "$.content")).hasSize(10);
					String first = JsonPath.read(body, "$.content[0].name");
					String second = JsonPath.read(body, "$.content[1].name");
					assertThat(first.compareToIgnoreCase(second)).isLessThanOrEqualTo(0);
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
					assertThat((java.util.List<String>) JsonPath.read(body, "$.content[*].brewery.name"))
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
					java.util.List<String> names = JsonPath.read(body, "$.content[*].name");
					assertThat(names).contains("Westvleteren 12", "Rochefort 10", "St. Bernardus Abt 12");
					java.util.List<Double> abvs = JsonPath.read(body, "$.content[*].abv");
					assertThat(abvs).allSatisfy(abv -> assertThat(abv).isBetween(9.0, 12.0));
				});
	}

	@Test
	void filtersByBreweryCountry() {
		client.get().uri("/api/v1/beers?country=Estonia")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((int) JsonPath.read(body, "$.totalElements")).isEqualTo(3);
					assertThat((java.util.List<String>) JsonPath.read(body, "$.content[*].brewery.name"))
							.containsOnly("Põhjala");
				});
	}

	@Test
	void sortsByAbvDescending() {
		client.get().uri("/api/v1/beers?sort=abv,desc&size=1")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.content[0].name")).isEqualTo("KBS");
					assertThat((double) JsonPath.read(body, "$.content[0].abv")).isEqualTo(12.0);
				});
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
					assertThat((String) JsonPath.read(body, "$.description")).isNotBlank();
					assertThat((int) JsonPath.read(body, "$.price.cents")).isEqualTo(750);
					assertThat((String) JsonPath.read(body, "$.price.currency")).isEqualTo("EUR");
				});
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
	void listsBreweriesSortedByName() {
		client.get().uri("/api/v1/breweries")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					java.util.List<String> names = JsonPath.read(body, "$[*].name");
					assertThat(names).hasSize(20)
							.isSortedAccordingTo(String.CASE_INSENSITIVE_ORDER);
					assertThat(names).contains("Brasserie Cantillon", "Põhjala");
				});
	}

}
