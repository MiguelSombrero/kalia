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

/**
 * Covers both halves of ADR-0014: the validation failures
 * GlobalExceptionHandler enriches, and the generic exceptions it leaves to
 * Spring Boot. The catalog endpoint is used only because it is the one real
 * endpoint that exists; the subject here is the shared advice.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class GlobalExceptionHandlerIT {

	@Autowired
	private RestTestClient client;

	/**
	 * Every route here but the catalog GET is authenticated since ADR-0028, so
	 * these requests carry a token — otherwise the filter chain answers 401
	 * and the exception handling under test is never reached.
	 */
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
				// Raw bytes, not a String: passing a String body with
				// application/json content-type gets Jackson-encoded as a
				// quoted JSON string, not sent as this literal JSON object.
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

	/**
	 * 405 is deliberately left to Spring Boot, whose handling returns the
	 * {@code Allow} header RFC 9110 requires. A ProblemDetail-returning
	 * handler here would carry no headers and silently drop it.
	 *
	 * <p>Authenticated on purpose: unauthenticated, the filter chain answers
	 * 401 before Spring MVC ever decides the method is unsupported, and this
	 * guard would pass without exercising the Allow contract at all.
	 */
	@Test
	void unsupportedMethodKeepsSpringBootsAllowHeader() {
		client.post().uri("/api/v1/beers")
				.header("Authorization", bearer())
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.METHOD_NOT_ALLOWED)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectHeader().valueEquals("Allow", "GET");
	}

	/**
	 * Malformed JSON is deliberately left to Spring Boot. Asserts the status
	 * contract, not Boot's wording, which is not ours to pin.
	 */
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
