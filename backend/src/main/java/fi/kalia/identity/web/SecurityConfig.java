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

/**
 * The application's one security filter chain: which routes are public, and
 * how a bearer token is validated (ADR-0028).
 */
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
						// Browsing needs no account (docs/architecture.md §6).
						.requestMatchers(HttpMethod.GET, "/api/v1/beers", "/api/v1/beers/*",
								"/api/v1/breweries")
						.permitAll()
						.requestMatchers("/actuator/health", "/actuator/health/**").permitAll()
						.requestMatchers("/v3/api-docs", "/v3/api-docs/**", "/swagger-ui/**",
								"/swagger-ui.html")
						.permitAll()
						.anyRequest().authenticated())
				.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()))
				// A bearer-token API holds no server-side session and is not
				// reachable from a browser form, so there is no session for CSRF
				// to protect and no cookie for a cross-site post to ride on.
				.sessionManagement(session -> session
						.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.csrf(csrf -> csrf.disable())
				.build();
	}

	/**
	 * Built from {@code jwk-set-uri} rather than {@code issuer-uri} because
	 * the two are different addresses in this stack: Keycloak stamps one fixed
	 * public {@code iss} into every token it issues (KC_HOSTNAME in
	 * docker-compose.yml), but that address is published loopback-only on the
	 * host and unreachable from inside the backend container, which must dial
	 * {@code keycloak:8080}. Spring Boot's {@code issuer-uri} property does
	 * both jobs at once and so cannot express the split — the same constraint
	 * ADR-0025 records for the frontend.
	 *
	 * <p>Do not drop the explicit validator: choosing {@code jwk-set-uri} also
	 * drops Boot's default issuer check, which the decoder does not add back.
	 */
	@Bean
	JwtDecoder jwtDecoder() {
		NimbusJwtDecoder decoder = NimbusJwtDecoder.withJwkSetUri(jwkSetUri).build();
		decoder.setJwtValidator(tokenValidator(issuerUri, audience));
		return decoder;
	}

	/**
	 * Expiry, issuer and audience. Package-private and static so
	 * {@code SecurityConfigTest} can exercise the rules against hand-built
	 * tokens: the {@code jwt()} test post-processor replaces the decoder
	 * outright, so an integration test never reaches these.
	 *
	 * <p>The audience entry rejects a token minted for a different client of
	 * the same realm. Keycloak adds ours via the {@code kalia-backend-audience}
	 * mapper on the {@code kalia-frontend} client (keycloak/realm-export.json).
	 */
	static OAuth2TokenValidator<Jwt> tokenValidator(String issuerUri, String audience) {
		return new DelegatingOAuth2TokenValidator<>(List.of(
				JwtValidators.createDefaultWithIssuer(issuerUri),
				new JwtClaimValidator<List<String>>(JwtClaimNames.AUD,
						claim -> claim != null && claim.contains(audience))));
	}

}
