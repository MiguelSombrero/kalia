package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

// Covers both halves of ADR-0014: validation failures GlobalExceptionHandler
// enriches, and generic exceptions left to Spring Boot.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class GlobalExceptionHandlerIT {

	@Autowired
	private RestTestClient client;

	// Every route but the catalog GET is authenticated (ADR-0028) — without a
	// token the filter chain answers 401 before this is reached.
	@MockitoBean
	private JwtDecoder jwtDecoder;

	private String bearer() {
		given(jwtDecoder.decode(anyString())).willReturn(TestTokens.testUser());
		return "Bearer test-token";
	}

	@Test
	void requestParameterValidationFailureYieldsFieldLevelErrors() {
		client.get().uri("/api/v1/beers?minAbv=-1")
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.detail")).isEqualTo("Validation failed");
					assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("minAbv");
					assertThat((String) JsonPath.read(body, "$.errors[0].message"))
							.isEqualTo("must be greater than or equal to 0");
				});
	}

	@Test
	void requestBodyValidationFailureYieldsFieldLevelErrors() {
		client.post().uri("/test/validation-probe")
				.header("Authorization", bearer())
				.contentType(MediaType.APPLICATION_JSON)
				// Raw bytes: a String body here gets Jackson-encoded as a quoted
				// JSON string instead of sent as this literal JSON object.
				.body("{\"name\": \"\"}".getBytes(StandardCharsets.UTF_8))
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.detail")).isEqualTo("Validation failed");
					assertThat((String) JsonPath.read(body, "$.errors[0].field")).isEqualTo("name");
					assertThat((String) JsonPath.read(body, "$.errors[0].message")).isEqualTo("must not be blank");
				});
	}

	// 405 stays with Spring Boot's own handling, which returns the RFC-9110
	// `Allow` header; a ProblemDetail handler here would drop it silently.
	// Authenticated on purpose, or 401 would pass this without ever
	// reaching the Allow contract.
	@Test
	void unsupportedMethodKeepsSpringBootsAllowHeader() {
		client.post().uri("/api/v1/beers")
				.header("Authorization", bearer())
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.METHOD_NOT_ALLOWED)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectHeader().valueEquals("Allow", "GET");
	}

	// Asserts the status contract, not Boot's own error wording.
	@Test
	void malformedJsonYieldsProblemJson400WithoutFieldDetail() {
		client.post().uri("/test/validation-probe")
				.header("Authorization", bearer())
				.contentType(MediaType.APPLICATION_JSON)
				.body("{not valid json".getBytes(StandardCharsets.UTF_8))
				.exchange()
				.expectStatus().isBadRequest()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat(body).doesNotContain("\"errors\""));
	}

}
