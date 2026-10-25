package fi.kalia.identity.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import tools.jackson.databind.json.JsonMapper;

// The 403 half of ProblemJsonSecurityErrorsIT: no route can answer 403 today
// (nothing requires an authority), so the handler is exercised directly.
class ProblemJsonSecurityHandlersTest {

	private final ProblemJsonSecurityHandlers handlers = new ProblemJsonSecurityHandlers(JsonMapper.builder().build());

	@Test
	void accessDeniedIsAProblemJson403KeepingTheBearerChallenge() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/cellar");
		MockHttpServletResponse response = new MockHttpServletResponse();

		handlers.accessDenied().handle(request, response, new AccessDeniedException("no"));

		assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_FORBIDDEN);
		assertThat(response.getContentType()).startsWith(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		assertThat(response.getHeader(HttpHeaders.WWW_AUTHENTICATE)).startsWith("Bearer");
		assertThat((Integer) JsonPath.read(response.getContentAsString(), "$.status")).isEqualTo(403);
		assertThat((String) JsonPath.read(response.getContentAsString(), "$.title")).isEqualTo("Forbidden");
	}

	@Test
	void anyAuthenticationFailureIsAProblemJson401WithoutItsMessage() throws Exception {
		MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/v1/cellar");
		MockHttpServletResponse response = new MockHttpServletResponse();

		handlers.authenticationEntryPoint().commence(request, response,
				new InvalidBearerTokenException("kid=secret-kid"));

		assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
		assertThat(response.getContentAsString()).doesNotContain("secret-kid");
		assertThat(response.getHeader(HttpHeaders.WWW_AUTHENTICATE)).contains("invalid_token");
	}

	@Test
	void aNonBearerFailureStillChallengesWithBearer() throws Exception {
		MockHttpServletResponse response = new MockHttpServletResponse();

		handlers.authenticationEntryPoint().commence(new MockHttpServletRequest("GET", "/x"), response,
				new BadCredentialsException("x"));

		assertThat(response.getHeader(HttpHeaders.WWW_AUTHENTICATE)).startsWith("Bearer");
	}

}
