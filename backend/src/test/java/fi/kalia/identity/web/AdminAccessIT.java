package fi.kalia.identity.web;

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
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;
import securityfixture.AdminProbeController;

// ADR-0101. The decoder is mocked only so no signature has to be minted; the
// converter and the rule are the real ones.
@Import({ TestcontainersConfiguration.class, AdminProbeController.class })
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class AdminAccessIT {

	private static final String PROBE = "/api/v1/admin/probe";

	@Autowired
	private RestTestClient client;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void aTokenWithTheAdminRoleIsAdmitted() {
		decodeAs(Map.of("realm_access", Map.of("roles", List.of("offline_access", "admin"))));

		client.get().uri(PROBE).header(HttpHeaders.AUTHORIZATION, "Bearer t")
				.exchange()
				.expectStatus().isOk();
	}

	@Test
	void aTokenWithoutTheRoleIsRefusedAsProblemJson403() {
		decodeAs(Map.of("realm_access", Map.of("roles", List.of("default-roles-kalia", "offline_access"))));

		expectForbidden();
	}

	@Test
	void anAnonymousCallerIsAnswered401() {
		client.get().uri(PROBE)
				.exchange()
				.expectStatus().isUnauthorized()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);
	}

	@Test
	void aTokenWithNoRealmAccessClaimIsRefused403() {
		decodeAs(Map.of());

		expectForbidden();
	}

	@Test
	void aMalformedRealmAccessClaimIsRefused403NeverAnError() {
		for (Object claim : List.<Object>of(
				"admin",
				List.of("admin"),
				Map.of("roles", "admin"),
				Map.of("roles", Map.of("admin", true)),
				Map.of("roles", List.of(42, true)),
				Map.of("role", List.of("admin")))) {
			decodeAs(Map.of("realm_access", claim));

			expectForbidden();
		}
	}

	@Test
	void theRoleInAScopeOrAnotherClaimGrantsNothing() {
		decodeAs(Map.of("scope", "admin", "roles", List.of("admin"),
				"resource_access", Map.of("kalia-backend", Map.of("roles", List.of("admin")))));

		expectForbidden();
	}

	private void expectForbidden() {
		client.get().uri(PROBE).header(HttpHeaders.AUTHORIZATION, "Bearer t")
				.exchange()
				.expectStatus().isForbidden()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectBody(String.class)
				.value(body -> {
					assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(403);
					assertThat((String) JsonPath.read(body, "$.instance")).isEqualTo(PROBE);
				});
	}

	private void decodeAs(Map<String, Object> claims) {
		given(jwtDecoder.decode(anyString())).willAnswer(call -> tokenWith(claims));
	}

	private static Jwt tokenWith(Map<String, Object> claims) {
		return Jwt.withTokenValue("t")
				.header("alg", "none")
				.subject("user-1")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.claims(all -> all.putAll(claims))
				.build();
	}

}
