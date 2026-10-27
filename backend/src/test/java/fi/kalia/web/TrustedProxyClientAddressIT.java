package fi.kalia.web;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0090. The test client connects from loopback, so loopback stands in for
// the edge proxy by being the one trusted peer; UntrustedProxyClientAddressIT
// is the same request from a peer that is not.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
		"logging.level.fi.kalia.web=INFO",
		"server.tomcat.remoteip.internal-proxies=127\\.0\\.0\\.1" })
@AutoConfigureRestTestClient
@ExtendWith(OutputCaptureExtension.class)
class TrustedProxyClientAddressIT {

	@Autowired
	private RestTestClient client;

	@Test
	void theAddressAProxyForwardsIsTheOneTheRequestIsLoggedUnder(CapturedOutput output) {
		client.get().uri("/api/v1/styles")
				.header("X-Forwarded-For", "203.0.113.5")
				.exchange()
				.expectStatus().isOk();

		assertThat(output.getOut().lines()
				.filter(line -> line.contains("GET /api/v1/styles -> 200")))
				.singleElement()
				.satisfies(line -> assertThat(line).contains("from 203.0.113.5\""));
	}

}
