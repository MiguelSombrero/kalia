package fi.kalia.identity.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.identity.domain.CurrentUser;
import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

class CurrentUserServiceTest {

	private static final String SUBJECT = "8f14e45f-ceea-467a-9a3c-1b2d4f6a8c90";

	private final CurrentUserService service = new CurrentUserService();

	@AfterEach
	void clearContext() {
		SecurityContextHolder.clearContext();
	}

	@Test
	void mapsTheTokenSubjectToTheUserId() {
		authenticateWith(jwt().build());

		CurrentUser user = service.require();

		assertThat(user.id()).isEqualTo(UUID.fromString(SUBJECT));
		assertThat(user.username()).isEqualTo("testuser");
		assertThat(user.email()).isEqualTo("testuser@example.com");
		assertThat(user.name()).isEqualTo("Test User");
	}

	@Test
	void leavesOptionalClaimsNullWhenTheTokenOmitsThem() {
		authenticateWith(Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject(SUBJECT)
				.claim("preferred_username", "testuser")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.build());

		CurrentUser user = service.require();

		assertThat(user.email()).isNull();
		assertThat(user.name()).isNull();
	}

	@Test
	void findsNobodyOnAnAnonymousRequest() {
		SecurityContextHolder.getContext().setAuthentication(new AnonymousAuthenticationToken(
				"key", "anonymous", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS")));

		assertThat(service.find()).isEmpty();
	}

	@Test
	void findsNobodyWhenTheContextIsEmpty() {
		assertThat(service.find()).isEmpty();
	}

	@Test
	void requireFailsLoudlyRatherThanReturningNullOnAnAnonymousRequest() {
		assertThatThrownBy(service::require)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("SecurityConfig");
	}

	@Test
	void rejectsASubjectThatIsNotAUuidInsteadOfInventingOne() {
		authenticateWith(jwt().subject("not-a-uuid").build());

		assertThatThrownBy(service::require)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("not-a-uuid");
	}

	@Test
	void rejectsATokenWithoutPreferredUsername() {
		Jwt withoutUsername = Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject(SUBJECT)
				.claim("email", "testuser@example.com")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300))
				.build();
		authenticateWith(withoutUsername);

		assertThatThrownBy(service::require)
				.isInstanceOf(IllegalStateException.class)
				.hasMessageContaining("preferred_username");
	}

	private static void authenticateWith(Jwt jwt) {
		SecurityContextHolder.getContext().setAuthentication(new JwtAuthenticationToken(jwt));
	}

	private static Jwt.Builder jwt() {
		return Jwt.withTokenValue("token")
				.header("alg", "RS256")
				.subject(SUBJECT)
				.claim("preferred_username", "testuser")
				.claim("email", "testuser@example.com")
				.claim("name", "Test User")
				.issuedAt(Instant.now())
				.expiresAt(Instant.now().plusSeconds(300));
	}

}
