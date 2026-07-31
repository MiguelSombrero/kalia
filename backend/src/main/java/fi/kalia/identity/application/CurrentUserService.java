package fi.kalia.identity.application;

import fi.kalia.identity.domain.CurrentUser;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Service;

/**
 * Resolves the caller of the current request from their access token
 * (ADR-0028). Reads the {@code SecurityContext} rather than taking the
 * principal as a parameter, so a service can ask who is calling without
 * every controller between it and the request threading the value through.
 */
@Service
public class CurrentUserService {

	/**
	 * The current user, or empty when the request is anonymous — as every
	 * request to a public endpoint (the whole catalog) is.
	 */
	public Optional<CurrentUser> find() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (!(authentication instanceof JwtAuthenticationToken token)) {
			return Optional.empty();
		}
		return Optional.of(from(token.getToken()));
	}

	/**
	 * The current user, failing when the request is anonymous. For code
	 * reachable only behind an authenticated route: the filter chain has
	 * already rejected anonymous callers with 401, so an empty context here
	 * is a routing mistake, not a client error.
	 */
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
