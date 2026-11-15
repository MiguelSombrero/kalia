package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.io.IOException;
import java.net.ServerSocket;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0114: the profile is optional, so an endpoint nobody answers on must
// cost a request nothing.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"management.opentelemetry.tracing.export.schedule-delay=100ms" })
@AutoConfigureRestTestClient
@ExtendWith(OutputCaptureExtension.class)
class ExporterUnavailableIT {

	@Autowired
	private RestTestClient client;

	@DynamicPropertySource
	static void nothingListens(DynamicPropertyRegistry registry) throws IOException {
		int port;
		try (ServerSocket socket = new ServerSocket(0)) {
			port = socket.getLocalPort();
		}
		registry.add("management.opentelemetry.tracing.export.otlp.endpoint",
				() -> "http://127.0.0.1:" + port + "/v1/traces");
	}

	@Test
	void requestsAnswerInTimeWhileNothingListensAndTheLogGainsOneLineForTheOutage(CapturedOutput output) {
		client.get().uri("/api/v1/styles").exchange().expectStatus().isOk();

		long slowest = 0;
		long deadline = System.nanoTime() + Duration.ofSeconds(60).toNanos();
		long settled = 0;
		while (System.nanoTime() < deadline && (exporterFailures(output).isEmpty() || settled < 20)) {
			long started = System.nanoTime();
			client.get().uri("/api/v1/styles").exchange().expectStatus().isOk();
			slowest = Math.max(slowest, Duration.ofNanos(System.nanoTime() - started).toMillis());
			if (!exporterFailures(output).isEmpty()) {
				settled++;
			}
			sleep(500);
		}

		assertThat(slowest).isLessThan(2000);
		assertThat(exporterFailures(output)).hasSize(1);
	}

	private static List<String> exporterFailures(CapturedOutput output) {
		return output.getAll().lines().filter(line -> line.contains("\"logger\":\"io.opentelemetry.exporter.")).toList();
	}

	private static void sleep(long millis) {
		try {
			Thread.sleep(millis);
		} catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

}
