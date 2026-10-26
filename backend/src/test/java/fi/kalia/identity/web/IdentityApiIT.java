package fi.kalia.identity.web;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

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

	private static final String AUTHENTICATED_ROUTE = "/api/v1/cellar";

	@Autowired
	private RestTestClient client;

	// Stands in for Keycloak; validation rules this bypasses are covered by
	// SecurityConfigTest.
	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void acceptsAValidBearerToken() {
		givenTokenFor(SUBJECT);

		client.get().uri(AUTHENTICATED_ROUTE)
				.header("Authorization", "Bearer any-value-the-decoder-is-mocked")
				.exchange()
				.expectStatus().isOk();
	}

	@Test
	void rejectsAnUnauthenticatedRequestForAProtectedRoute() {
		client.get().uri(AUTHENTICATED_ROUTE)
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void rejectsAGarbageBearerToken() {
		given(jwtDecoder.decode(anyString())).willThrow(new BadJwtException("bad"));

		client.get().uri(AUTHENTICATED_ROUTE)
				.header("Authorization", "Bearer not-a-real-token")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	// Guards the CSRF-disable premise (SecurityConfig): if a change here starts
	// setting a cookie, this fails, and csrf(...) needs reconsidering first.
	@Test
	void issuesNoCookieSoCsrfCannotApply() {
		givenTokenFor(SUBJECT);

		client.get().uri(AUTHENTICATED_ROUTE)
				.header("Authorization", "Bearer any-value-the-decoder-is-mocked")
				.exchange()
				.expectStatus().isOk()
				.expectHeader().doesNotExist("Set-Cookie");

		client.get().uri("/api/v1/beers?size=1")
				.exchange()
				.expectStatus().isOk()
				.expectHeader().doesNotExist("Set-Cookie");
	}

	// Pins the single star in `/api/v1/beers/*`: widening it to `/**` would
	// make every path below a beer anonymous the day one is added.
	@Test
	void doesNotExtendCatalogAccessToSubResourcesOfABeer() {
		client.get().uri("/api/v1/beers/8f14e45f-ceea-467a-9a3c-1b2d4f6a8c90/reviews")
				.exchange()
				.expectStatus().isUnauthorized();
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
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.build();
		given(jwtDecoder.decode(anyString())).willReturn(jwt);
	}

}
