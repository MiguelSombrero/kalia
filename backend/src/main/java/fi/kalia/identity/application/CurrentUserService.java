package fi.kalia.identity.application;

import fi.kalia.identity.domain.CurrentUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

// Resolves the caller from the SecurityContext rather than a threaded
// principal parameter (ADR-0028).
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

	private static CurrentUser from(Jwt jwt) {
		String subject = jwt.getSubject();
		String username = jwt.getClaimAsString("preferred_username");
		if (username == null) {
			throw new IllegalStateException(
					("Access token for subject %s carries no preferred_username claim. The realm's "
							+ "client is missing the built-in profile scope.").formatted(subject));
		}
		return new CurrentUser(
				parseSubject(subject),
				username,
				jwt.getClaimAsString("email"),
				jwt.getClaimAsString("name"));
	}

	private static UUID parseSubject(String subject) {
		try {
			return UUID.fromString(subject);
		} catch (IllegalArgumentException cause) {
			throw new IllegalStateException(
					("Access token subject '%s' is not a UUID. Keycloak issues UUID subjects; a "
							+ "different identity provider would need CurrentUser.id widened to a "
							+ "String.").formatted(subject),
					cause);
		}
	}

}
