package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class KaliaApplicationIT {

	@Autowired
	private RestTestClient restTestClient;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void healthEndpointReportsUp() {
		restTestClient.get().uri("/actuator/health")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat(body).contains("\"status\":\"UP\""));
	}

	@Test
	void healthEndpointHidesComponentDetail() {
		restTestClient.get().uri("/actuator/health")
				.exchange()
				.expectBody(String.class)
				.value(body -> assertThat(body).doesNotContain("components").doesNotContain("PostgreSQL"));
	}

	// Pins the declared exposure so an upgrade can't widen it unnoticed.
	// Must be authenticated, or 401 masks a widened exposure as a narrow one.
	@Test
	void unexposedActuatorEndpointsAreNotReachable() {
		given(jwtDecoder.decode(anyString())).willReturn(TestTokens.testUser());

		for (String endpoint : List.of("env", "beans", "configprops", "loggers", "mappings")) {
			restTestClient.get().uri("/actuator/" + endpoint)
					.header("Authorization", "Bearer test-token")
					.exchange()
					.expectStatus().isNotFound();
		}
	}

	/** Everything under /actuator but health needs a token (ADR-0028). */
	@Test
	void actuatorBeyondHealthIsNotPubliclyReadable() {
		restTestClient.get().uri("/actuator/metrics")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void flywayCreatesModuleSchemas() {
		List<String> schemas = jdbcTemplate.queryForList(
				"SELECT schema_name FROM information_schema.schemata", String.class);

		assertThat(schemas).contains("catalog", "cellar");
	}

	// The store never shipped (ADR-0004, ADR-0005).
	@Test
	void flywayDoesNotCreateStoreSchemas() {
		List<String> schemas = jdbcTemplate.queryForList(
				"SELECT schema_name FROM information_schema.schemata", String.class);

		assertThat(schemas).doesNotContain("cart", "ordering", "payment");
	}

}
