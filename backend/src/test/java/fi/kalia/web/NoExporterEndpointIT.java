package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import io.opentelemetry.sdk.logs.export.LogRecordExporter;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0114: the profile is optional. With no endpoint nothing is exported, so
// there is nothing to fail or retry, and the backend answers as before.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class NoExporterEndpointIT {

	@Autowired
	private ApplicationContext context;

	@Autowired
	private RestTestClient client;

	@Test
	void startsWithoutAnExporterAndAnswers() {
		assertThat(context.getBeansOfType(SpanExporter.class)).isEmpty();
		client.get().uri("/api/v1/styles").exchange().expectStatus().isOk();
	}

	@Test
	void logsAreNeverExportedFromTheProcess() {
		assertThat(context.getBeansOfType(LogRecordExporter.class)).isEmpty();
	}

}
