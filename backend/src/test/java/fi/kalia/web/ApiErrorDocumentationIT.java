package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Every error the API sends is in {@code /v3/api-docs} with the shape it has on
 * the wire (ADR-0014). The operations are discovered from the spec, so a handler
 * added later is held to these rules without anyone remembering to list it.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ApiErrorDocumentationIT {

	private static final List<String> METHODS = List.of("get", "post", "put", "patch", "delete");

	private static final String PROBLEM_JSON = "application/problem+json";

	@Autowired
	private RestTestClient client;

	@Test
	void everyOperationListsAnErrorResponse() {
		assertThat(operationsViolating(operation -> !errorCodes(operation).isEmpty()))
				.as("operations listing no error response").isEmpty();
	}

	@Test
	void everyAuthenticatedOperationListsItsUnauthorized() {
		assertThat(operationsViolating(operation ->
				!operation.containsKey("security") || errorCodes(operation).contains("401")))
				.as("operations requiring a token that list no 401").isEmpty();
	}

	@Test
	void everyOperationTakingInputListsItsBadRequest() {
		assertThat(operationsViolating(operation -> !takesInput(operation) || errorCodes(operation).contains("400")))
				.as("operations taking a parameter or a body that list no 400").isEmpty();
	}

	@Test
	void everyErrorResponseIsProblemJsonWithADeclaredSchema() {
		assertThat(operationsViolating(operation -> errorCodes(operation).stream().allMatch(code -> {
			Map<String, Object> content = content(operation, code);
			return content.keySet().equals(Set.of(PROBLEM_JSON));
		}))).as("operations with an error response that is not exactly problem+json").isEmpty();
	}

	// The RFC 9457 members sit at the top level of a problem, so a schema with a
	// `properties` member would describe a body nothing sends.
	@Test
	void noProblemSchemaNestsItsExtensionsUnderProperties() {
		Map<String, Map<String, Object>> schemas = JsonPath.read(apiDocs(), "$.components.schemas");

		assertThat(schemas).doesNotContainKey("ProblemDetail");
		for (String name : List.of("Problem", "ValidationProblem", "DuplicateBeerProblem", "DuplicateBreweryProblem")) {
			Map<String, Object> properties = properties(schemas, name);
			assertThat(properties).as(name).doesNotContainKey("properties").containsKeys("status", "detail");
		}
	}

	@Test
	void aValidationProblemDeclaresItsFieldErrors() {
		String body = apiDocs();

		assertThat(properties(JsonPath.read(body, "$.components.schemas"), "ValidationProblem")).containsKey("errors");
		List<String> required = JsonPath.read(body, "$.components.schemas.ValidationProblem.required");
		assertThat(required).contains("errors");
		List<String> itemRequired = JsonPath.read(body, "$.components.schemas.FieldErrorDto.required");
		assertThat(itemRequired).containsExactlyInAnyOrder("field", "message");
	}

	@Test
	void aBadRequestOfAddingABeerIsDeclaredAsOneOfTheTwoShapesItHas() {
		String body = apiDocs();

		List<String> refs = JsonPath.read(body,
				"$.paths['/api/v1/beers'].post.responses['400'].content['application/problem+json'].schema.oneOf[*].$ref");
		assertThat(refs).containsExactlyInAnyOrder("#/components/schemas/ValidationProblem",
				"#/components/schemas/Problem");
	}

	@Test
	void theDuplicateConflictsOfAddingABeerAreDeclaredWithTheirOwnSchemas() {
		String body = apiDocs();

		List<String> refs = JsonPath.read(body,
				"$.paths['/api/v1/beers'].post.responses['409'].content['application/problem+json'].schema.oneOf[*].$ref");
		assertThat(refs).containsExactlyInAnyOrder("#/components/schemas/DuplicateBeerProblem",
				"#/components/schemas/DuplicateBreweryProblem");
		Map<String, Object> schemas = JsonPath.read(body, "$.components.schemas");
		assertThat(properties(schemas, "DuplicateBeerProblem")).containsKey("existingBeerId");
		assertThat(properties(schemas, "DuplicateBreweryProblem"))
				.containsKeys("existingBreweryId", "existingBreweryName", "existingBreweryCountryCode");
	}

	private List<String> operationsViolating(Predicate<Map<String, Object>> holds) {
		String body = apiDocs();
		Map<String, Map<String, Object>> paths = JsonPath.read(body, "$.paths");
		List<String> violating = new ArrayList<>();
		// The test tree's probe controllers (/test/...) share this context.
		paths.entrySet().stream().filter(entry -> entry.getKey().startsWith("/api/")).forEach(entry -> METHODS.stream().filter(entry.getValue()::containsKey).forEach(method -> {
			@SuppressWarnings("unchecked")
			Map<String, Object> operation = (Map<String, Object>) entry.getValue().get(method);
			if (!holds.test(operation)) {
				violating.add(method.toUpperCase(Locale.ROOT) + " " + entry.getKey());
			}
		}));
		return violating;
	}

	private static List<String> errorCodes(Map<String, Object> operation) {
		@SuppressWarnings("unchecked")
		Map<String, Object> responses = (Map<String, Object>) operation.get("responses");
		return responses.keySet().stream().filter(code -> code.startsWith("4") || code.startsWith("5")).toList();
	}

	@SuppressWarnings("unchecked")
	private static Map<String, Object> content(Map<String, Object> operation, String code) {
		Map<String, Object> response = (Map<String, Object>) ((Map<String, Object>) operation.get("responses")).get(code);
		Object content = response.get("content");
		return content == null ? Map.of() : (Map<String, Object>) content;
	}

	private static boolean takesInput(Map<String, Object> operation) {
		return operation.containsKey("requestBody") || operation.containsKey("parameters");
	}

	@SuppressWarnings("unchecked")
	private static Map<String, Object> properties(Map<String, ?> schemas, String name) {
		Map<String, Object> schema = (Map<String, Object>) schemas.get(name);
		assertThat(schema).as("schema " + name).isNotNull();
		return (Map<String, Object>) schema.get("properties");
	}

	private String apiDocs() {
		return client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class).returnResult().getResponseBody();
	}

}
