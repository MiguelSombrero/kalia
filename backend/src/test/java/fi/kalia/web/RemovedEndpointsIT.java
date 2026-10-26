package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

/** Pins the operations removed before the API became additive-only, so none comes back unnoticed. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class RemovedEndpointsIT {

	@Autowired
	private RestTestClient client;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void theApiDocsListNeitherRemovedPath() {
		String body = client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();

		Map<String, Object> paths = JsonPath.read(body, "$.paths");
		assertThat(paths).doesNotContainKeys("/api/v1/me", "/api/v1/beers/batch");
	}

	@Test
	void theCurrentUserRouteIsGone() {
		given(jwtDecoder.decode(anyString())).willReturn(Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject("8f14e45f-ceea-467a-9a3c-1b2d4f6a8c90")
				.claim("aud", List.of("kalia-backend"))
				.claim("preferred_username", "testuser")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.build());

		client.get().uri("/api/v1/me")
				.header("Authorization", "Bearer any-value-the-decoder-is-mocked")
				.exchange()
				.expectStatus().isNotFound();
	}

	// "batch" now reaches /beers/{id} as an id, which is not a UUID.
	@Test
	void theBatchLookupRouteIsGone() {
		client.get().uri("/api/v1/beers/batch?ids=00000000-0000-0000-0000-000000000000")
				.exchange()
				.expectStatus().isBadRequest();
	}

}
