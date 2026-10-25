package fi.kalia.identity.web;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.oauth2.server.resource.web.BearerTokenAuthenticationEntryPoint;
import org.springframework.security.oauth2.server.resource.web.access.BearerTokenAccessDeniedHandler;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Answers the 401 and 403 the filter chain sends before any controller runs
 * with the same problem+json every other error has (ADR-0014). Spring
 * Security's bearer handlers set the RFC 9110 {@code WWW-Authenticate}
 * challenge and the status, so they run first and only a body is added: a
 * bare {@code ProblemDetail} would drop the header, as it does for 405's
 * {@code Allow}. The body never carries the failure's message, which can name
 * a key, an issuer or a claim.
 */
@Component
class ProblemJsonSecurityHandlers {

	private final JsonMapper jsonMapper;

	ProblemJsonSecurityHandlers(JsonMapper jsonMapper) {
		this.jsonMapper = jsonMapper;
	}

	AuthenticationEntryPoint authenticationEntryPoint() {
		BearerTokenAuthenticationEntryPoint bearer = new BearerTokenAuthenticationEntryPoint();
		return (request, response, exception) -> {
			bearer.commence(request, response, exception);
			writeProblem(request, response, HttpStatus.UNAUTHORIZED);
		};
	}

	AccessDeniedHandler accessDenied() {
		BearerTokenAccessDeniedHandler bearer = new BearerTokenAccessDeniedHandler();
		return (request, response, exception) -> {
			bearer.handle(request, response, exception);
			writeProblem(request, response, HttpStatus.FORBIDDEN);
		};
	}

	private void writeProblem(HttpServletRequest request, HttpServletResponse response, HttpStatus status)
			throws IOException {
		ProblemDetail problem = ProblemDetail.forStatus(status);
		problem.setInstance(URI.create(request.getRequestURI()));
		response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
		jsonMapper.writeValue(response.getOutputStream(), problem);
	}

}
