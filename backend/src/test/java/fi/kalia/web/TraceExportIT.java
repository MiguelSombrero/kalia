package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.awaitility.Awaitility.await;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;

import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import io.opentelemetry.sdk.logs.export.LogRecordExporter;
import java.io.IOException;
import java.time.Duration;
import java.util.Objects;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.micrometer.metrics.test.autoconfigure.AutoConfigureMetrics;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0114. With an endpoint set, the backend's spans reach an OTLP receiver.
// What they carry is read off the wire, where the exporter's own attributes
// count as well as Spring's.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"management.endpoints.web.exposure.include=health,prometheus",
		"logging.level.fi.kalia.web=INFO",
		"management.opentelemetry.tracing.export.schedule-delay=100ms" })
@AutoConfigureRestTestClient
@AutoConfigureMetrics
@ExtendWith(OutputCaptureExtension.class)
class TraceExportIT {

	private static final FakeOtlpCollector COLLECTOR = startCollector();

	private static final String BEARER = "bearer-token-value-1f3a9c";

	@Autowired
	private ApplicationContext context;

	@Autowired
	private RestTestClient client;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@DynamicPropertySource
	static void collector(DynamicPropertyRegistry registry) {
		registry.add("management.opentelemetry.tracing.export.otlp.endpoint", COLLECTOR::tracesEndpoint);
	}

	@AfterAll
	static void stopCollector() {
		COLLECTOR.close();
	}

	@Test
	void aRequestReachesTheCollectorAsASpanNamingTheRouteTemplateAndStatus() {
		given(jwtDecoder.decode(anyString())).willReturn(TestTokens.testUser());

		client.get().uri("/test/observability-probe/echo/7c1e")
				.header("Authorization", "Bearer " + BEARER)
				.exchange()
				.expectStatus().isOk();

		FakeOtlpCollector.Export export = awaitExportContaining("http get /test/observability-probe/echo/{id}");
		assertThat(export.path()).isEqualTo("/v1/traces");
		assertThat(export.contentType()).isEqualTo("application/x-protobuf");
		assertThat(export.bodyText())
				.containsPattern("uri[^a-zA-Z0-9]{1,6}/test/observability-probe/echo/\\{id}")
				.containsPattern("status[^a-zA-Z0-9]{1,6}200");
	}

	@Test
	void noQueryStringTokenOrBodyReachesASpanAMetricOrALogLine(CapturedOutput output) {
		given(jwtDecoder.decode(anyString())).willReturn(TestTokens.testUser());

		client.get().uri("/api/v1/styles?search=hunter2secret&token=q9x8y7")
				.header("Authorization", "Bearer " + BEARER)
				.exchange()
				.expectStatus().isOk();
		awaitExportContaining("http get /api/v1/styles");

		assertThat(COLLECTOR.exports())
				.allSatisfy(export -> assertThat(export.bodyText())
						.doesNotContain("hunter2secret", "q9x8y7", BEARER, "search="));

		String metrics = client.get().uri("/actuator/prometheus").exchange()
				.expectStatus().isOk()
				.returnResult(String.class).getResponseBody();
		assertThat(metrics).contains("http_server_requests_seconds_count")
				.doesNotContain("hunter2secret", "q9x8y7", BEARER);
		assertThat(output.getAll()).doesNotContain("hunter2secret", "q9x8y7", BEARER);
	}

	@Test
	void logsAreNeverExportedFromTheProcessEvenWithAnEndpoint() {
		assertThat(context.getBeansOfType(LogRecordExporter.class)).isEmpty();
	}

	@Test
	void theReadinessProbeIsNotExported() {
		client.get().uri("/actuator/health").exchange().expectStatus().isOk();
		client.get().uri("/api/v1/styles").exchange().expectStatus().isOk();
		awaitExportContaining("http get /api/v1/styles");

		assertThat(COLLECTOR.exports())
				.allSatisfy(export -> assertThat(export.bodyText()).doesNotContain("/actuator/health"));
	}

	private static FakeOtlpCollector.Export awaitExportContaining(String text) {
		return await().atMost(Duration.ofSeconds(10))
				.until(() -> COLLECTOR.exports().stream().filter(e -> e.bodyText().contains(text)).findFirst()
						.orElse(null), Objects::nonNull);
	}

	private static FakeOtlpCollector startCollector() {
		try {
			return new FakeOtlpCollector();
		} catch (IOException e) {
			throw new IllegalStateException(e);
		}
	}

}
