package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class OpenApiDocumentationIT {

	@Autowired
	private RestTestClient client;

	@Test
	void catalogEndpointsAreDocumentedWithTagsAndSummaries() {
		String body = client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();

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
	void swaggerUiIsServed() {
		client.get().uri("/swagger-ui/index.html")
				.exchange()
				.expectStatus().isOk();
	}

}
