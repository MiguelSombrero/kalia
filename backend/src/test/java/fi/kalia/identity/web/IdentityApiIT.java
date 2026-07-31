package fi.kalia.identity.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class IdentityApiIT {

	private static final String SUBJECT = "8f14e45f-ceea-467a-9a3c-1b2d4f6a8c90";

	@Autowired
	private RestTestClient client;

	/**
	 * Stands in for Keycloak so the suite needs no identity provider running.
	 * The validation rules this bypasses are covered by
	 * {@link SecurityConfigTest}.
	 */
	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void returnsTheCallerBehindTheBearerToken() {
		givenTokenFor(SUBJECT);

		client.get().uri("/api/v1/me")
				.header("Authorization", "Bearer any-value-the-decoder-is-mocked")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> {
					assertThat((String) JsonPath.read(body, "$.id")).isEqualTo(SUBJECT);
					assertThat((String) JsonPath.read(body, "$.username")).isEqualTo("testuser");
					assertThat((String) JsonPath.read(body, "$.email"))
							.isEqualTo("testuser@example.com");
				});
	}

	@Test
	void rejectsAnUnauthenticatedRequestForTheCurrentUser() {
		client.get().uri("/api/v1/me")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void rejectsAGarbageBearerToken() {
		given(jwtDecoder.decode(anyString())).willThrow(new BadJwtException("bad"));

		client.get().uri("/api/v1/me")
				.header("Authorization", "Bearer not-a-real-token")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void leavesTheCatalogPublic() {
		// Browsing needs no account (docs/architecture.md §6). Guards against a
		// future filter-chain edit locking the catalog behind authentication.
		client.get().uri("/api/v1/beers?size=1").exchange().expectStatus().isOk();
		client.get().uri("/api/v1/breweries").exchange().expectStatus().isOk();
	}

	@Test
	void leavesTheHealthEndpointPublic() {
		// docker-compose and CI both gate readiness on this without a token.
		client.get().uri("/actuator/health").exchange().expectStatus().isOk();
	}

	private void givenTokenFor(String subject) {
		Jwt jwt = Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject(subject)
				.claim("aud", List.of("kalia-backend"))
				.claim("preferred_username", "testuser")
				.claim("email", "testuser@example.com")
				.claim("name", "Test User")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.build();
		given(jwtDecoder.decode(anyString())).willReturn(jwt);
	}

}
