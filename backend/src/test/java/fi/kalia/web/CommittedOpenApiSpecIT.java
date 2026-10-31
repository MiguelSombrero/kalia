package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.SerializationFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * ADR-0093: {@code backend/openapi.json} is what both clients generate from, so
 * it must say what the application serves. {@code make openapi-spec} rewrites it.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(
		webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
		// The *ProbeController classes under src/test are scanned like any
		// controller; they are not part of the contract.
		properties = "springdoc.paths-to-exclude=/test/**")
@AutoConfigureRestTestClient
class CommittedOpenApiSpecIT {

	/** Maven runs failsafe from {@code backend/}. */
	private static final Path COMMITTED = Path.of("openapi.json");

	/**
	 * Sorted keys and fixed indentation, so the file changes only when the
	 * contract does, whatever order springdoc happened to emit it in.
	 */
	private static final JsonMapper CANONICAL = JsonMapper.builder()
			.enable(SerializationFeature.INDENT_OUTPUT)
			.enable(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS)
			.build();

	@Autowired
	private RestTestClient client;

	@Test
	void theCommittedSpecIsTheOneTheApplicationServes() throws IOException {
		String served = canonical(apiDocs());

		if (Boolean.getBoolean("openapi.write")) {
			Files.writeString(COMMITTED, served);
			return;
		}

		assertThat(COMMITTED).as("backend/openapi.json (run `make openapi-spec` to write it)").exists();
		assertThat(Files.readString(COMMITTED).replace("\r\n", "\n"))
				.as("backend/openapi.json differs from /v3/api-docs; run `make openapi-spec` and commit the result")
				.isEqualTo(served);
	}

	/** Without {@code servers}: springdoc fills it with this test's random port. */
	private static String canonical(String json) {
		Map<String, Object> spec = CANONICAL.readValue(json, new TypeReference<Map<String, Object>>() {});
		spec.remove("servers");
		// Jackson indents with the platform's line separator; the file is LF.
		return CANONICAL.writeValueAsString(spec).replace("\r\n", "\n") + "\n";
	}

	private String apiDocs() {
		return client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
