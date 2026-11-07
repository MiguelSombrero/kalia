package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;

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

	// Pins the declared exposure so an upgrade can't widen it unnoticed. Without
	// a token an unexposed endpoint is a 404: the actuator needs none (ADR-0088),
	// so exposure is the only thing between a caller and an endpoint.
	@Test
	void unexposedActuatorEndpointsAreNotReachable() {
		for (String endpoint : List.of("env", "beans", "configprops", "loggers", "mappings", "metrics", "prometheus")) {
			restTestClient.get().uri("/actuator/" + endpoint)
					.exchange()
					.expectStatus().isNotFound();
		}
	}

	@Test
	void flywayCreatesModuleSchemas() {
		List<String> schemas = jdbcTemplate.queryForList(
				"SELECT schema_name FROM information_schema.schemata", String.class);

		assertThat(schemas).contains("catalog", "cellar", "feed");
	}

	// The store never shipped (ADR-0004, ADR-0005).
	@Test
	void flywayDoesNotCreateStoreSchemas() {
		List<String> schemas = jdbcTemplate.queryForList(
				"SELECT schema_name FROM information_schema.schemata", String.class);

		assertThat(schemas).doesNotContain("cart", "ordering", "payment");
	}

}
