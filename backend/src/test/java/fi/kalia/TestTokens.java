package fi.kalia;

import java.time.Instant;
import java.util.List;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Access tokens for integration tests, so the suite needs no Keycloak. A test
 * pairs this with a mocked {@code JwtDecoder}; the validation rules that
 * mocking bypasses are covered by {@code SecurityConfigTest}.
 */
public final class TestTokens {

	public static final String SUBJECT = "8f14e45f-ceea-467a-9a3c-1b2d4f6a8c90";

	private TestTokens() {
	}

	public static Jwt testUser() {
		return Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject(SUBJECT)
				.claim("aud", List.of("kalia-backend"))
				.claim("preferred_username", "testuser")
				.claim("email", "testuser@example.com")
				.claim("name", "Test User")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.build();
	}

	/**
	 * A second, distinct caller — for asserting that one user's token cannot
	 * reach another's data.
	 */
	public static Jwt user(String subject, String username) {
		return Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject(subject)
				.claim("aud", List.of("kalia-backend"))
				.claim("preferred_username", username)
				.claim("email", username + "@example.com")
				.claim("name", username)
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.build();
	}

}
