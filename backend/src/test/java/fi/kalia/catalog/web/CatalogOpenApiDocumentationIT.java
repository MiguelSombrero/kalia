package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class CatalogOpenApiDocumentationIT {

	@Autowired
	private RestTestClient client;

	@Test
	void catalogEndpointsAreDocumentedWithTagsAndSummaries() {
		String body = apiDocs();

		List<String> tagNames = JsonPath.read(body, "$.tags[*].name");
		assertThat(tagNames).contains("Catalog");

		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/beers'].get.summary"))
				.isEqualTo("Search beers");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/beers/{id}'].get.summary"))
				.isEqualTo("Get beer details");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/breweries'].get.summary"))
				.isEqualTo("List breweries");
	}

	@Test
	void bothPagedHandlersDocumentTheOffsetBound() {
		String body = apiDocs();

		for (String path : List.of("/api/v1/beers", "/api/v1/breweries")) {
			assertThat((String) JsonPath.read(body, "$.paths['" + path + "'].get.description"))
					.as(path).contains("A page skipping more than 10000 rows (page × size) is refused");
			List<String> page = JsonPath.read(body, "$.paths['" + path + "'].get.parameters[?(@.name == 'page')].description");
			assertThat(page).as(path).containsExactly("Zero-based page index; page × size is at most 10000");
		}
	}

	@Test
	void beerSummarySchemaMarksNonNullableFieldsRequired() {
		String body = apiDocs();

		List<String> required = JsonPath.read(body, "$.components.schemas.BeerSummaryDto.required");
		// springdoc does not infer "required" from Java non-nullability alone:
		// every field defaulted to optional until requiredMode was set
		// explicitly.
		assertThat(required).containsExactlyInAnyOrder("id", "name", "style", "abv", "brewery", "status");

		Map<String, Object> summaryProperties =
				JsonPath.read(body, "$.components.schemas.BeerSummaryDto.properties");
		Map<String, Object> detailsProperties =
				JsonPath.read(body, "$.components.schemas.BeerDetailsDto.properties");
		assertThat(summaryProperties).doesNotContainKey("price");
		assertThat(detailsProperties).doesNotContainKey("price").doesNotContainKey("description");
		assertThat(body).doesNotContain("MoneyDto");
	}

	@Test
	void beerReadsReportTheStatusAReadCanCarryNotTheStorageEnum() {
		String body = apiDocs();

		for (String dto : List.of("BeerSummaryDto", "BeerDetailsDto")) {
			List<String> required = JsonPath.read(body, "$.components.schemas." + dto + ".required");
			assertThat(required).as(dto).contains("status");
			List<String> status = JsonPath.read(body, "$.components.schemas." + dto + ".properties.status.enum");
			assertThat(status).as(dto).containsExactly("APPROVED", "PENDING");
		}
	}

	@Test
	void eachReviewDecisionBodyIsTypedToTheOutcomesItsEndpointCanReturn() {
		String body = apiDocs();

		List<String> decided = JsonPath.read(body, "$.components.schemas.SuggestionDecisionDto.properties.outcome.enum");
		assertThat(decided).containsExactly("APPROVED", "REJECTED");
		List<String> removed = JsonPath.read(body, "$.components.schemas.BeerRemovalDto.properties.outcome.enum");
		assertThat(removed).containsExactly("REMOVED");

		for (String path : List.of("/api/v1/admin/suggestions/{id}/approval", "/api/v1/admin/suggestions/{id}/rejection")) {
			assertThat((String) JsonPath.read(body, "$.paths['" + path + "'].post.responses['200'].content['*/*'].schema['$ref']"))
					.as(path).endsWith("/SuggestionDecisionDto");
		}
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/admin/beers/{id}/removal'].post.responses['200'].content['*/*'].schema['$ref']"))
				.endsWith("/BeerRemovalDto");
	}

	@Test
	void swaggerUiIsServed() {
		client.get().uri("/swagger-ui/index.html")
				.exchange()
				.expectStatus().isOk();
	}

	private String apiDocs() {
		return client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}

