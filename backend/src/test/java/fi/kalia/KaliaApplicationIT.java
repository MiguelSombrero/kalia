package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class KaliaApplicationIT {

	@Autowired
	private RestTestClient restTestClient;

	@Autowired
	private JdbcTemplate jdbcTemplate;

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

	/**
	 * Exposure is declared, not inherited: only health is published, so a
	 * dependency upgrade cannot widen the actuator surface unnoticed.
	 */
	@Test
	void unexposedActuatorEndpointsAreNotReachable() {
		for (String endpoint : List.of("env", "beans", "configprops", "loggers", "mappings")) {
			restTestClient.get().uri("/actuator/" + endpoint)
					.exchange()
					.expectStatus().isNotFound();
		}
	}

	@Test
	void flywayCreatesModuleSchemas() {
		List<String> schemas = jdbcTemplate.queryForList(
				"SELECT schema_name FROM information_schema.schemata", String.class);

		assertThat(schemas).contains("catalog", "cart", "ordering", "payment");
	}

}
