package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0014, backend/README.md: a module's advice is scoped to its own
// module's controllers and must not answer outside that scope.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ModuleAdviceScopingIT {

	@Autowired
	private RestTestClient client;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private String bearer() {
		given(jwtDecoder.decode(anyString())).willReturn(TestTokens.testUser());
		return "Bearer test-token";
	}

	@Test
	void feedsAdviceDoesNotAnswerForAControllerOutsideFeed() {
		client.get().uri("/test/cross-module-advice-probe")
				.header("Authorization", bearer())
				.exchange()
				.expectStatus().isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
				.expectBody(String.class)
				.value(body -> assertThat(body).doesNotContain("probe-exception-message"));
	}

}
