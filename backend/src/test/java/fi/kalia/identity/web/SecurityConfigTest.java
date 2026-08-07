package fi.kalia.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.jspecify.annotations.Nullable;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * The bearer-token rules, exercised directly. An integration test cannot
 * reach them: {@code SecurityMockMvcRequestPostProcessors.jwt()} installs its
 * own decoder, so a token it builds is never validated.
 */
class SecurityConfigTest {

	private static final String ISSUER = "http://localhost:8081/realms/kalia";

	private static final String AUDIENCE = "kalia-backend";

	@Test
	void acceptsATokenFromOurIssuerCarryingOurAudience() {
		assertThat(validate(token(ISSUER, List.of(AUDIENCE))).hasErrors()).isFalse();
	}

	@Test
	void acceptsOurAudienceAlongsideOthers() {
		assertThat(validate(token(ISSUER, List.of("account", AUDIENCE))).hasErrors()).isFalse();
	}

	@Test
	void rejectsATokenMintedForAnotherClientOfTheSameRealm() {
		assertThat(validate(token(ISSUER, List.of("some-other-client"))).hasErrors()).isTrue();
	}

	@Test
	void rejectsATokenCarryingNoAudienceAtAll() {
		// The shape every token had before the realm gained its audience
		// mapper, so this fails if that mapper is dropped from realm-export.json.
		assertThat(validate(token(ISSUER, null)).hasErrors()).isTrue();
	}

	@Test
	void rejectsATokenFromADifferentIssuer() {
		assertThat(validate(token("http://evil.example.com/realms/kalia", List.of(AUDIENCE)))
				.hasErrors()).isTrue();
	}

	@Test
	void rejectsAnExpiredToken() {
		Jwt expired = builder(ISSUER)
				.claim("aud", List.of(AUDIENCE))
				.issuedAt(Instant.now().minusSeconds(3600))
				.expiresAt(Instant.now().minusSeconds(300))
				.build();

		assertThat(validate(expired).hasErrors()).isTrue();
	}

	private static OAuth2TokenValidatorResult validate(Jwt jwt) {
		return SecurityConfig.tokenValidator(ISSUER, AUDIENCE).validate(jwt);
	}

	private static Jwt token(String issuer, @Nullable List<String> audience) {
		Jwt.Builder token = builder(issuer)
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300));
		return audience == null ? token.build() : token.claim("aud", audience).build();
	}

	private static Jwt.Builder builder(String issuer) {
		return Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.issuer(issuer)
				.subject("8f14e45f-ceea-467a-9a3c-1b2d4f6a8c90")
				.claim("preferred_username", "testuser");
	}

}
