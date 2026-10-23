package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
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
class CatalogOffsetBoundIT {

	@Autowired
	private RestTestClient client;

	@ParameterizedTest
	@ValueSource(strings = {"/api/v1/beers", "/api/v1/breweries"})
	void servesAPageSkippingExactlyTenThousandRows(String path) {
		client.get().uri(path + "?page=100&size=100")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat((int) JsonPath.read(body, "$.page")).isEqualTo(100));
		client.get().uri(path + "?page=500")
				.exchange()
				.expectStatus().isOk();
	}

	@ParameterizedTest
	@ValueSource(strings = {
			"/api/v1/beers?page=101&size=100",
			"/api/v1/beers?page=501",
			"/api/v1/beers?page=10000&size=2",
			"/api/v1/breweries?page=101&size=100",
			"/api/v1/breweries?page=501",
			"/api/v1/breweries?page=10000&size=2"})
	void refusesAPageSkippingMoreThanTenThousandRowsAsProblemJson(String uri) {
		client.get().uri(uri)
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.detail"))
						.contains("must not skip more than 10000 rows"));
	}

}
