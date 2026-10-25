package fi.kalia.identity.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.BadJwtException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0014: a 401 is problem+json like every other error, and still carries
// the WWW-Authenticate header RFC 9110 requires.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ProblemJsonSecurityErrorsIT {

	@Autowired
	private RestTestClient client;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void aRequestWithoutATokenIsAProblemJson401KeepingItsChallenge() {
		client.get().uri("/api/v1/cellar")
				.exchange()
				.expectStatus().isUnauthorized()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectHeader().value(HttpHeaders.WWW_AUTHENTICATE, challenge -> assertThat(challenge).startsWith("Bearer"))
				.expectBody(String.class)
				.value(body -> {
					assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(401);
					assertThat((String) JsonPath.read(body, "$.title")).isEqualTo("Unauthorized");
					assertThat((String) JsonPath.read(body, "$.instance")).isEqualTo("/api/v1/cellar");
				});
	}

	@Test
	void aRejectedTokenIsAProblemJson401NamingWhyInTheChallenge() {
		given(jwtDecoder.decode(anyString())).willThrow(new BadJwtException("expired"));

		client.get().uri("/api/v1/cellar")
				.header(HttpHeaders.AUTHORIZATION, "Bearer rejected")
				.exchange()
				.expectStatus().isUnauthorized()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON)
				.expectHeader().value(HttpHeaders.WWW_AUTHENTICATE,
						challenge -> assertThat(challenge).startsWith("Bearer ").contains("error=\"invalid_token\""))
				.expectBody(String.class)
				.value(body -> assertThat((Integer) JsonPath.read(body, "$.status")).isEqualTo(401));
	}

	// The token's own failure message must stay out of the body: a decoder's
	// message can name keys, issuers or claims (ADR-0014: only designed
	// messages reach `detail`).
	@Test
	void aRejectedTokensOwnMessageDoesNotReachTheBody() {
		given(jwtDecoder.decode(anyString())).willThrow(new BadJwtException("signed by an unknown key kid=secret-kid"));

		client.get().uri("/api/v1/cellar")
				.header(HttpHeaders.AUTHORIZATION, "Bearer rejected")
				.exchange()
				.expectStatus().isUnauthorized()
				.expectBody(String.class)
				.value(body -> assertThat(body).doesNotContain("secret-kid"));
	}

}
