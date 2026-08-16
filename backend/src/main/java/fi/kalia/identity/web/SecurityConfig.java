package fi.kalia.identity.web;

import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtValidators;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.web.SecurityFilterChain;

// ADR-0028; guarded by ArchitectureTest.onlyIdentityConfiguresWebSecurity.
@Configuration
class SecurityConfig {

	private final String issuerUri;

	private final String jwkSetUri;

	private final String audience;

	SecurityConfig(
			@Value("${kalia.auth.issuer-uri}") String issuerUri,
			@Value("${kalia.auth.jwk-set-uri}") String jwkSetUri,
			@Value("${kalia.auth.audience}") String audience) {
		this.issuerUri = issuerUri;
		this.jwkSetUri = jwkSetUri;
		this.audience = audience;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
		return http
				.authorizeHttpRequests(requests -> requests
						// Do not widen "/api/v1/beers/*" to "/**": a later sub-resource
						// would turn silently public instead of staying authenticated.
						.requestMatchers(HttpMethod.GET, "/api/v1/beers", "/api/v1/beers/*",
								"/api/v1/breweries")
						.permitAll()
						// "/swagger-ui.html" needs its own entry — it is not under /swagger-ui/.
						.requestMatchers("/actuator/health/**").permitAll()
						.requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html")
						.permitAll()
						.anyRequest().authenticated())
				.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
				.sessionManagement(session -> session
						.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				// Do not enable CSRF protection here without first re-reading
				// why it is off. A CSRF attack needs the browser to attach a
				// credential by itself; this API accepts only an Authorization
				// header, issues no cookie and keeps no session, so a
				// cross-site request arrives with no credential at all. That
				// premise, not this call, is what makes it safe — and it stops
				// holding the moment anything here authenticates by cookie or
				// creates a session. `issuesNoCookieSoCsrfCannotApply` in
				// IdentityApiIT fails if that changes (ADR-0028).
				.csrf(csrf -> csrf.disable())
				.build();
	}

	/**
	 * Built from {@code jwk-set-uri}, not {@code issuer-uri}: Keycloak's fixed
	 * public {@code iss} (KC_HOSTNAME) is unreachable from inside the backend
	 * container, which must dial {@code keycloak:8080} instead — the same
	 * split ADR-0025 records for the frontend. Do not drop the explicit
	 * validator: {@code jwk-set-uri} also drops Boot's default issuer check.
	 */
	@Bean
	JwtDecoder jwtDecoder() {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
		decoder.setJwtValidator(tokenValidator(issuerUri, audience));
		return decoder;
	}

	// Expiry, issuer and audience; guarded by SecurityConfigTest, which the
	// integration tests can't reach since the jwt() post-processor replaces
	// the decoder outright.
	static OAuth2TokenValidator<Jwt> tokenValidator(String issuerUri, String audience) {
		return new DelegatingOAuth2TokenValidator<>(List.of(
				JwtValidators.createDefaultWithIssuer(issuerUri),
				new JwtClaimValidator<List<String>>(JwtClaimNames.AUD,
						claim -> claim != null && claim.contains(audience))));
	}

}
