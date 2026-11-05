package fi.kalia.identity.web;

import java.util.Collection;
import java.util.List;
import java.util.Map;
import org.springframework.core.convert.converter.Converter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Turns Keycloak's {@code realm_access.roles} claim into {@code ROLE_*}
 * authorities (ADR-0101). A claim that is absent or not the shape Keycloak
 * writes grants nothing; it must never throw, since an exception in the
 * converter surfaces as a 500 rather than a refusal.
 */
final class RealmRoleAuthorities implements Converter<Jwt, Collection<GrantedAuthority>> {

	static final String ADMIN = "admin";

	@Override
	public Collection<GrantedAuthority> convert(Jwt jwt) {
		if (!(jwt.getClaim("realm_access") instanceof Map<?, ?> realmAccess)
				|| !(realmAccess.get("roles") instanceof Collection<?> roles)) {
			return List.of();
		}
		return roles.stream()
				.filter(String.class::isInstance)
				.<GrantedAuthority>map(role -> new SimpleGrantedAuthority("ROLE_" + role))
				.toList();
	}

}
