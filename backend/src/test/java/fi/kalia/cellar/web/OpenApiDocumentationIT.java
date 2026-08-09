package fi.kalia.cellar.web;

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

/** {@code /v3/api-docs} is public (SecurityConfig), so these need no bearer token. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class OpenApiDocumentationIT {

	@Autowired
	private RestTestClient client;

	@Test
	void cellarEndpointsAreDocumentedWithTagsAndSummaries() {
		String body = apiDocs();

		List<String> tagNames = JsonPath.read(body, "$.tags[*].name");
		assertThat(tagNames).contains("Cellar");

		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar'].get.summary"))
				.isEqualTo("List the caller's cellar");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar/entries/{entryId}/bottles'].get.summary"))
				.isEqualTo("List one entry's bottles");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles'].post.summary"))
				.isEqualTo("Add a bottle");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles/{id}'].patch.summary"))
				.isEqualTo("Update a bottle");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles/{id}'].delete.summary"))
				.isEqualTo("Remove a bottle");
	}

	@Test
	void entryAndBottleSchemasMarkNonNullableFieldsRequired() {
		String body = apiDocs();

		List<String> entryRequired = JsonPath.read(body, "$.components.schemas.EntryDto.required");
		assertThat(entryRequired).containsExactlyInAnyOrder("id", "beerId", "quantity", "createdAt", "updatedAt");

		List<String> bottleRequired = JsonPath.read(body, "$.components.schemas.BottleDto.required");
		// springdoc does not infer "required" from Java non-nullability alone —
		// brewedDate/bestBeforeDate are @Nullable and must stay out of this list.
		assertThat(bottleRequired)
				.containsExactlyInAnyOrder("id", "entryId", "containerType", "createdAt", "updatedAt");
	}

	private String apiDocs() {
		return client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
