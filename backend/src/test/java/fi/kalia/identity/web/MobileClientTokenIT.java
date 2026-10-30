package fi.kalia.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import java.io.IOException;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0095. The only integration test that keeps the real JwtDecoder (the
// others mock it), pointed at a JWKS served here and fed tokens signed with a
// test key. That the realm's mapper puts the audience in a real token is
// scripts/check-keycloak-pkce-flow.mjs's to prove.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class MobileClientTokenIT {

	private static final String ISSUER = "http://localhost:8081/realms/kalia";

	private static final String AUTHENTICATED_ROUTE = "/api/v1/cellar";

	private static final RSAKey SIGNING_KEY = generateKey();

	private static final HttpServer JWKS_SERVER = serveJwks();

	@DynamicPropertySource
	static void keycloakStandIn(DynamicPropertyRegistry registry) {
		registry.add("kalia.auth.issuer-uri", () -> ISSUER);
		registry.add("kalia.auth.jwk-set-uri",
				() -> "http://127.0.0.1:" + JWKS_SERVER.getAddress().getPort() + "/certs");
	}

	@AfterAll
	static void stopJwksServer() {
		JWKS_SERVER.stop(0);
	}

	@Autowired
	private RestTestClient client;

	@Test
	void acceptsAKaliaMobileTokenCarryingTheBackendAudience() throws JOSEException {
		client.get().uri(AUTHENTICATED_ROUTE)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + mobileToken(List.of("kalia-backend", "account")))
				.exchange()
				.expectStatus().isOk();
	}

	// Keycloak writes a lone audience as a string, not an array; the check
	// must read both.
	@Test
	void acceptsAKaliaMobileTokenWhoseOnlyAudienceIsAString() throws JOSEException {
		client.get().uri(AUTHENTICATED_ROUTE)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + mobileToken("kalia-backend"))
				.exchange()
				.expectStatus().isOk();
	}

	@Test
	void rejectsTheSameTokenWithoutTheBackendAudienceAsAProblemJson401() throws JOSEException {
		client.get().uri(AUTHENTICATED_ROUTE)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + mobileToken(List.of("account")))
				.exchange()
				.expectStatus().isUnauthorized()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectHeader().value(HttpHeaders.WWW_AUTHENTICATE,
						challenge -> assertThat(challenge).startsWith("Bearer ").contains("error=\"invalid_token\""))
				.expectBody(String.class)
				.value(body -> assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(401));
	}

	@Test
	void rejectsATokenWithNoAudienceClaimAtAll() throws JOSEException {
		client.get().uri(AUTHENTICATED_ROUTE)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + mobileToken((Object) null))
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void rejectsATokenSignedByAKeyTheRealmDoesNotPublish() throws JOSEException {
		RSAKey stranger = generateKey();

		client.get().uri(AUTHENTICATED_ROUTE)
				.header(HttpHeaders.AUTHORIZATION, "Bearer " + sign(stranger, claims("kalia-backend")))
				.exchange()
				.expectStatus().isUnauthorized();
	}

	private static String mobileToken(Object audience) throws JOSEException {
		return sign(SIGNING_KEY, claims(audience));
	}

	private static JWTClaimsSet claims(Object audience) {
		Instant now = Instant.now();
		JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
				.issuer(ISSUER)
				.subject(TestTokens.SUBJECT)
				.jwtID(UUID.randomUUID().toString())
				.issueTime(Date.from(now))
				.expirationTime(Date.from(now.plusSeconds(300)))
				.claim("azp", "kalia-mobile")
				.claim("scope", "openid profile email offline_access")
				.claim("preferred_username", "testuser");
		if (audience != null) {
			claims.claim("aud", audience);
		}
		return claims.build();
	}

	private static String sign(RSAKey key, JWTClaimsSet claims) throws JOSEException {
		SignedJWT jwt = new SignedJWT(
				new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(key.getKeyID()).build(), claims);
		jwt.sign(new RSASSASigner(key));
		return jwt.serialize();
	}

	private static RSAKey generateKey() {
		try {
			return new RSAKeyGenerator(2048).keyID(UUID.randomUUID().toString()).generate();
		}
		catch (JOSEException e) {
			throw new IllegalStateException(e);
		}
	}

	private static HttpServer serveJwks() {
		try {
			HttpServer server = HttpServer.create(new InetSocketAddress(InetAddress.getLoopbackAddress(), 0), 0);
			byte[] jwks = new JWKSet(SIGNING_KEY.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
			server.createContext("/certs", exchange -> {
				exchange.getResponseHeaders().add("Content-Type", "application/json");
				exchange.sendResponseHeaders(200, jwks.length);
				exchange.getResponseBody().write(jwks);
				exchange.close();
			});
			server.start();
			return server;
		}
		catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}

}
