package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.micrometer.metrics.test.autoconfigure.AutoConfigureMetrics;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0088. The failsafe configuration quiets fi.kalia to WARN and exposes
// health only, so this test opts in to the two things it observes.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"logging.level.fi.kalia.web=INFO",
		"management.endpoints.web.exposure.include=health,prometheus" })
@AutoConfigureRestTestClient
@AutoConfigureMetrics
@ExtendWith(OutputCaptureExtension.class)
class ObservabilityIT {

	private static final String TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";

	private static final String TRACEPARENT = "00-" + TRACE_ID + "-00f067aa0ba902b7-01";

	@Autowired
	private RestTestClient client;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void aRequestIsLoggedUnderTheTraceIdTheCallerSent(CapturedOutput output) {
		client.get().uri("/api/v1/styles")
				.header("traceparent", TRACEPARENT)
				.exchange()
				.expectStatus().isOk();

		assertThat(output.getOut().lines()
				.filter(line -> line.contains("GET /api/v1/styles -> 200"))
				.toList())
				.singleElement()
				.satisfies(line -> assertThat(line).contains("\"traceId\":\"" + TRACE_ID + "\""));
	}

	@Test
	void aRequestRejectedBySecurityIsStillLogged(CapturedOutput output) {
		client.get().uri("/api/v1/cellar/bottles")
				.header("traceparent", TRACEPARENT)
				.exchange()
				.expectStatus().isUnauthorized();

		assertThat(output.getOut()).contains("GET /api/v1/cellar/bottles -> 401");
	}

	@Test
	void theRequestLogIsOneJsonObjectPerLine(CapturedOutput output) {
		client.get().uri("/api/v1/styles").exchange().expectStatus().isOk();

		assertThat(output.getOut().lines()
				.filter(line -> line.contains("GET /api/v1/styles -> 200")))
				.isNotEmpty()
				.allSatisfy(line -> assertThat(line).startsWith("{\"@timestamp\"").endsWith("}"));
	}

	@Test
	void metricsAreNotPubliclyReadable() {
		client.get().uri("/actuator/prometheus")
				.exchange()
				.expectStatus().isUnauthorized();
	}

	@Test
	void serverErrorsByRouteAndEventPublicationCountersAreReadableWithAToken(CapturedOutput output) {
		given(jwtDecoder.decode(anyString())).willReturn(TestTokens.testUser());
		client.get().uri("/test/observability-probe/fail")
				.header("Authorization", "Bearer test-token")
				.exchange()
				.expectStatus().is5xxServerError();

		assertThat(output.getOut()).contains("GET /test/observability-probe/fail -> 500");

		client.get().uri("/actuator/prometheus")
				.header("Authorization", "Bearer test-token")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.value(body -> assertThat(body.lines().toList())
						.anySatisfy(line -> assertThat(line)
								.startsWith("http_server_requests_seconds_count{")
								.contains("outcome=\"SERVER_ERROR\"")
								.contains("uri=\"/test/observability-probe/fail\""))
						.anySatisfy(line -> assertThat(line).startsWith("kalia_events_publication_retries_total"))
						.anySatisfy(line -> assertThat(line).startsWith("kalia_events_publication_exhausted_total")));
	}

}
