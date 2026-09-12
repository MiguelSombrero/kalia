package fi.kalia.feed.web;

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

/** {@code /v3/api-docs} is public (SecurityConfig), so this needs no bearer token. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class OpenApiDocumentationIT {

	@Autowired
	private RestTestClient client;

	@Test
	void feedEndpointIsDocumentedUnderItsOwnTag() {
		String body = apiDocs();

		List<String> tagNames = JsonPath.read(body, "$.tags[*].name");
		assertThat(tagNames).contains("Feed");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/feed'].get.summary")).isEqualTo("Read the feed");
		assertThat((Object) JsonPath.read(body, "$.paths['/api/v1/feed'].get.responses.200")).isNotNull();
	}

	@Test
	void feedSchemasMarkNonNullableFieldsRequired() {
		String body = apiDocs();

		List<String> lineRequired = JsonPath.read(body, "$.components.schemas.FeedLineDto.required");
		// springdoc does not infer "required" from Java non-nullability alone —
		// brewedDate is @Nullable and must stay out of this list.
		assertThat(lineRequired).containsExactlyInAnyOrder("username", "beerName", "brewery", "quantity",
				"occurredAt");

		List<String> pageRequired = JsonPath.read(body, "$.components.schemas.FeedPageDto.required");
		assertThat(pageRequired).containsExactly("content");
	}

	private String apiDocs() {
		return client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
