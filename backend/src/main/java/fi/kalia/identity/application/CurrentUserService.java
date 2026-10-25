package fi.kalia.identity.application;

import fi.kalia.identity.domain.CurrentUser;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

// Resolves the caller from the SecurityContext rather than a threaded
// principal parameter (ADR-0028).
@Slf4j
@Service
public class CurrentUserService {

	public Optional<CurrentUser> find() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (!(authentication instanceof JwtAuthenticationToken token)) {
			return Optional.empty();
		}
		return Optional.of(from(token.getToken()));
	}

	// For code reachable only behind an authenticated route: an empty context
	// here is a routing mistake, not a client error — the filter chain
	// already rejected anonymous callers with 401.
	public CurrentUser require() {
		return find().orElseThrow(() -> new IllegalStateException(
				"No authenticated user in the security context. A caller reached code that "
						+ "requires one through a route the filter chain treats as public "
						+ "(SecurityConfig)."));
	}

	public UUID requireId() {
		return require().id();
	}

	public String requireUsername() {
		return require().username();
	}

	// An AuthenticationException thrown from a controller reaches the 401 entry
	// point through ExceptionTranslationFilter. Its message is sent to the
	// client in WWW-Authenticate: keep claim values out of it.
	private static CurrentUser from(Jwt jwt) {
		String subject = jwt.getSubject();
		String username = jwt.getClaimAsString("preferred_username");
		if (username == null) {
			log.warn("Access token for subject {} carries no preferred_username claim. The realm's client "
					+ "is missing the built-in profile scope.", subject);
			throw new InvalidBearerTokenException("The access token carries no preferred_username claim");
		}
		return new CurrentUser(
				parseSubject(subject),
				username,
				jwt.getClaimAsString("email"),
				jwt.getClaimAsString("name"));
	}

	private static UUID parseSubject(@Nullable String subject) {
		try {
			return UUID.fromString(Objects.requireNonNullElse(subject, ""));
		} catch (IllegalArgumentException cause) {
			log.warn("Access token subject '{}' is not a UUID. Keycloak issues UUID subjects; a different "
					+ "identity provider would need CurrentUser.id widened to a String.", subject);
			throw new InvalidBearerTokenException("The access token's subject is not a UUID", cause);
		}
	}

}
