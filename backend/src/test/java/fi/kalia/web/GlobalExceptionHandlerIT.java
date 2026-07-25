package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Exercises GlobalExceptionHandler. Uses /api/v1/beers (a catalog
 * endpoint) incidentally, only because it's the one real endpoint that
 * exists today — this suite's subject is the shared advice, not catalog.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class GlobalExceptionHandlerIT {

	@Autowired
	private RestTestClient client;

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
				});
	}

	@Test
	void unsupportedMethodYieldsProblemJson405WithSupportedMethodsGuidance() {
		client.post().uri("/api/v1/beers")
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.METHOD_NOT_ALLOWED)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> assertThat((String) JsonPath.read(body, "$.detail")).contains("GET"));
	}

}
