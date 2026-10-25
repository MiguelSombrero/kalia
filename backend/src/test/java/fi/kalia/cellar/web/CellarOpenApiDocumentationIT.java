package fi.kalia.cellar.web;

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

/** {@code /v3/api-docs} is public (SecurityConfig), so these need no bearer token. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class CellarOpenApiDocumentationIT {

	@Autowired
	private RestTestClient client;

	@Test
	void cellarEndpointsAreDocumentedWithTagsAndSummaries() {
		String body = apiDocs();

		List<String> tagNames = JsonPath.read(body, "$.tags[*].name");
		assertThat(tagNames).contains("Cellar");

		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar'].get.summary"))
				.isEqualTo("List the caller's cellar");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles'].post.summary"))
				.isEqualTo("Add bottles");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles/{id}'].patch.summary"))
				.isEqualTo("Update a bottle");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles/{id}'].delete.summary"))
				.isEqualTo("Remove a bottle");
	}

	@Test
	void publicCellarEndpointIsDocumentedUnderItsOwnTag() {
		String body = apiDocs();

		List<String> tagNames = JsonPath.read(body, "$.tags[*].name");
		assertThat(tagNames).contains("Public cellar");
		assertThat((String) JsonPath.read(body, "$.paths['/api/v1/cellars/{username}'].get.summary"))
				.isEqualTo("Read a public cellar");
		assertThat((Object) JsonPath.read(body, "$.paths['/api/v1/cellars/{username}'].get.responses.200"))
				.isNotNull();
		assertThat((Object) JsonPath.read(body, "$.paths['/api/v1/cellars/{username}'].get.responses.404"))
				.isNotNull();
	}

	@Test
	void thePublicCellarsPagingParametersAreDocumentedWithTheirBoundsAndDefaults() {
		String body = apiDocs();

		assertThat(pagingBound(body, "page", "default")).isZero();
		assertThat(pagingBound(body, "page", "minimum")).isZero();
		assertThat(pagingBound(body, "page", "maximum")).isEqualTo(PublicCellarController.MAX_PAGE);
		assertThat(pagingBound(body, "size", "default")).isEqualTo(PublicCellarController.DEFAULT_PAGE_SIZE);
		assertThat(pagingBound(body, "size", "minimum")).isEqualTo(1);
		assertThat(pagingBound(body, "size", "maximum")).isEqualTo(PublicCellarController.MAX_PAGE_SIZE);
	}

	private static int pagingBound(String body, String parameter, String keyword) {
		List<Integer> found = JsonPath.read(body,
				"$.paths['/api/v1/cellars/{username}'].get.parameters[?(@.name=='" + parameter + "')].schema." + keyword);
		return found.getFirst();
	}

	// The public response is its own type, not EntryDto/BottleDto (ADR-0050),
	// so a field added to the owner's shape cannot reach strangers by default.
	@Test
	void thePublicCellarResponseIsADistinctSchemaFromTheOwnersShape() {
		String body = apiDocs();

		assertThat((Object) JsonPath.read(body, "$.components.schemas.PublicCellarDto")).isNotNull();
		assertThat((Object) JsonPath.read(body, "$.components.schemas.PublicCellarEntryDto")).isNotNull();
		assertThat((Object) JsonPath.read(body, "$.components.schemas.PublicCellarBottleDto")).isNotNull();

		List<String> entryRequired = JsonPath.read(body, "$.components.schemas.PublicCellarEntryDto.required");
		assertThat(entryRequired)
				.containsExactlyInAnyOrder("id", "beer", "quantity", "createdAt", "updatedAt", "bottles");
		List<String> bottleRequired = JsonPath.read(body, "$.components.schemas.PublicCellarBottleDto.required");
		assertThat(bottleRequired).containsExactlyInAnyOrder("id", "entryId", "containerType", "createdAt", "updatedAt");
		Map<String, Object> rootProperties = JsonPath.read(body, "$.components.schemas.PublicCellarDto.properties");
		assertThat(rootProperties).containsOnlyKeys("username", "entries", "page", "totalPages", "totalBeers",
				"totalBottles", "lastBottleAddedAt");
		List<String> rootRequired = JsonPath.read(body, "$.components.schemas.PublicCellarDto.required");
		assertThat(rootRequired).containsExactlyInAnyOrder("username", "entries", "page", "totalPages", "totalBeers",
				"totalBottles");
	}

	// ADR-0083: exactly the beer facts the cellar pages show, nothing more.
	@Test
	void bothEntrySchemasNestTheSameBeerFactsSchema() {
		String body = apiDocs();

		String ownerRef = JsonPath.read(body, "$.components.schemas.EntryDto.properties.beer.$ref");
		String publicRef = JsonPath.read(body, "$.components.schemas.PublicCellarEntryDto.properties.beer.$ref");
		assertThat(ownerRef).isEqualTo(publicRef).isEqualTo("#/components/schemas/CellarBeerDto");
		Map<String, Object> beerProperties = JsonPath.read(body, "$.components.schemas.CellarBeerDto.properties");
		assertThat(beerProperties).containsOnlyKeys("id", "name", "brewery", "style", "abv");
		List<String> beerRequired = JsonPath.read(body, "$.components.schemas.CellarBeerDto.required");
		assertThat(beerRequired).containsExactlyInAnyOrder("id", "name", "brewery", "style", "abv");
	}

	@Test
	void entryAndBottleSchemasMarkNonNullableFieldsRequired() {
		String body = apiDocs();

		List<String> entryRequired = JsonPath.read(body, "$.components.schemas.EntryDto.required");
		assertThat(entryRequired)
				.containsExactlyInAnyOrder("id", "beer", "quantity", "createdAt", "updatedAt", "bottles");

		List<String> bottleRequired = JsonPath.read(body, "$.components.schemas.BottleDto.required");
		// springdoc does not infer "required" from Java non-nullability alone —
		// brewedDate/bestBeforeDate are @Nullable and must stay out of this list.
		assertThat(bottleRequired)
				.containsExactlyInAnyOrder("id", "entryId", "containerType", "createdAt", "updatedAt");
	}

	@Test
	void everyOperationDocumentsItsSuccessResponse() {
		String body = apiDocs();

		assertThat((Object) JsonPath.read(body, "$.paths['/api/v1/cellar'].get.responses.200")).isNotNull();
		assertThat((Object) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles'].post.responses.201")).isNotNull();
		assertThat((Object) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles/{id}'].patch.responses.200"))
				.isNotNull();
		assertThat((Object) JsonPath.read(body, "$.paths['/api/v1/cellar/bottles/{id}'].delete.responses.204"))
				.isNotNull();
	}

	@Test
	void everyCellarWriteDocumentsTheConcurrentWriteConflict() {
		String body = apiDocs();

		for (String operation : List.of("$.paths['/api/v1/cellar/bottles'].post",
				"$.paths['/api/v1/cellar/bottles/{id}'].patch", "$.paths['/api/v1/cellar/bottles/{id}'].delete")) {
			assertThat((Object) JsonPath.read(body, operation + ".responses.409.content['application/problem+json']"))
					.as(operation).isNotNull();
		}
	}

	private String apiDocs() {
		return client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
