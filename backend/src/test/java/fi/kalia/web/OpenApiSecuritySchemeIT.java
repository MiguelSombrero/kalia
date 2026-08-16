package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;

/** {@code /v3/api-docs} is public (SecurityConfig), so these need no bearer token. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class OpenApiSecuritySchemeIT {

	@Autowired
	private RestTestClient client;

	@Test
	void oauth2SecuritySchemeIsConfiguredForAuthorizationCodeWithPkce() {
		String body = apiDocs();

		assertThat((String) JsonPath.read(body, "$.components.securitySchemes.oauth2.type")).isEqualTo("oauth2");
		Map<String, ?> authorizationCode =
				JsonPath.read(body, "$.components.securitySchemes.oauth2.flows.authorizationCode");
		assertThat((String) authorizationCode.get("authorizationUrl")).endsWith("/protocol/openid-connect/auth");
		assertThat((String) authorizationCode.get("tokenUrl")).endsWith("/protocol/openid-connect/token");
	}

	@Test
	void everyAuthenticatedOperationRequiresTheOauth2Scheme() {
		String body = apiDocs();

		assertThat(securitySchemeNames(body, "$.paths['/api/v1/cellar'].get.security")).contains("oauth2");
		assertThat(securitySchemeNames(body, "$.paths['/api/v1/cellar/entries/{entryId}/bottles'].get.security"))
				.contains("oauth2");
		assertThat(securitySchemeNames(body, "$.paths['/api/v1/cellar/bottles'].post.security")).contains("oauth2");
		assertThat(securitySchemeNames(body, "$.paths['/api/v1/cellar/bottles/{id}'].patch.security"))
				.contains("oauth2");
		assertThat(securitySchemeNames(body, "$.paths['/api/v1/cellar/bottles/{id}'].delete.security"))
				.contains("oauth2");
		assertThat(securitySchemeNames(body, "$.paths['/api/v1/me'].get.security")).contains("oauth2");
	}

	@Test
	void publicCatalogOperationRequiresNoSecurityScheme() {
		String body = apiDocs();

		Map<String, Object> operation = JsonPath.read(body, "$.paths['/api/v1/beers'].get");
		assertThat(operation).doesNotContainKey("security");
	}

	@SuppressWarnings("unchecked")
	private List<String> securitySchemeNames(String body, String jsonPath) {
		List<Map<String, ?>> security = JsonPath.read(body, jsonPath);
		return security.stream().flatMap(requirement -> requirement.keySet().stream()).toList();
	}

	private String apiDocs() {
		return client.get().uri("/v3/api-docs")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
