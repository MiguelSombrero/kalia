package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
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

// Pins the wire shape of the errors that carry more than the RFC 9457 members
// (ADR-0014): the members are top level, and the same fields name the same
// thing whichever module refused the request.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ErrorBodyShapesIT {

	private static final String BEARER = "Bearer shapes-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private String postBeer(String json) {
		given(jwtDecoder.decode("shapes-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), "shapes"));
		return client.post().uri("/api/v1/beers")
				.header("Authorization", BEARER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(json.getBytes(StandardCharsets.UTF_8))
				.exchange()
				.expectBody(String.class).returnResult().getResponseBody();
	}

	private String postRefusedBeer(String json) {
		String body = postBeer(json);
		assertThat((Integer) JsonPath.read(body, "$.status")).isGreaterThanOrEqualTo(400);
		return body;
	}

	@Test
	void aCatalogRefusalAndABeanValidationFailureHaveOneFieldErrorShape() {
		UUID brewery = jdbc.queryForObject("SELECT id FROM catalog.brewery LIMIT 1", UUID.class);
		String catalogRefusal = postRefusedBeer("""
				{"name": "Shape Ale", "style": "Imaginary Ale", "abv": 5.0, "breweryId": "%s"}""".formatted(brewery));
		String beanValidation = postRefusedBeer("""
				{"name": "", "style": "Quadrupel", "abv": 5.0, "breweryId": "%s"}""".formatted(brewery));

		for (String body : List.of(catalogRefusal, beanValidation)) {
			Map<String, Object> problem = JsonPath.read(body, "$");
			assertThat(problem).containsOnlyKeys("title", "status", "detail", "instance", "errors");
			assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(400);
			assertThat((String) JsonPath.read(body, "$.detail")).isEqualTo(ValidationProblem.DETAIL);
			List<Map<String, Object>> errors = JsonPath.read(body, "$.errors");
			assertThat(errors).isNotEmpty().allSatisfy(error -> assertThat(error).containsOnlyKeys("field", "message"));
		}
	}

	@Test
	void aDuplicateBeerNamesTheBeerItDuplicatesAtTheTopLevel() {
		String name = "Shape Stout " + UUID.randomUUID();
		String added = postBeer("""
				{"name": "%s", "style": "Quadrupel", "abv": 5.0, "newBrewery": {"name": "%s", "countryCode": "FI"}}"""
				.formatted(name, "Shape Panimo " + UUID.randomUUID()));
		String breweryId = JsonPath.read(added, "$.brewery.id");
		String beerId = JsonPath.read(added, "$.id");

		String body = postRefusedBeer("""
				{"name": "%s", "style": "Quadrupel", "abv": 5.0, "breweryId": "%s"}""".formatted(name, breweryId));

		Map<String, Object> problem = JsonPath.read(body, "$");
		assertThat(problem).containsOnlyKeys("title", "status", "detail", "instance", "existingBeerId");
		assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(409);
		assertThat((String) JsonPath.read(body, "$.existingBeerId")).isEqualTo(beerId);
	}

	@Test
	void aDuplicateBreweryNamesTheBreweryAsTheCatalogSpellsItAtTheTopLevel() {
		String breweryName = "Shape Panimo " + UUID.randomUUID();
		String added = postBeer("""
				{"name": "Shape Stout", "style": "Quadrupel", "abv": 5.0, "newBrewery": {"name": "%s", "countryCode": "FI"}}"""
				.formatted(breweryName));
		String breweryId = JsonPath.read(added, "$.brewery.id");

		String body = postRefusedBeer("""
				{"name": "Shape Porter", "style": "Quadrupel", "abv": 5.0,
				 "newBrewery": {"name": "%s.", "countryCode": "FI"}}""".formatted(breweryName.toUpperCase(Locale.ROOT)));

		Map<String, Object> problem = JsonPath.read(body, "$");
		assertThat(problem).containsOnlyKeys("title", "status", "detail", "instance", "existingBreweryId",
				"existingBreweryName", "existingBreweryCountryCode");
		assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(409);
		assertThat((String) JsonPath.read(body, "$.existingBreweryId")).isEqualTo(breweryId);
		assertThat((String) JsonPath.read(body, "$.existingBreweryName")).isEqualTo(breweryName);
		assertThat((String) JsonPath.read(body, "$.existingBreweryCountryCode")).isEqualTo("FI");
	}

}
