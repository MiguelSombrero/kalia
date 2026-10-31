package fi.kalia.appconfig.web;

import static org.assertj.core.api.Assertions.assertThat;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestcontainersConfiguration;
import java.io.IOException;
import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.client.RestTestClient;
import org.testcontainers.containers.Container.ExecResult;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.MountableFile;

/**
 * What the server tells an installed app about itself. The operator's command is
 * the real {@code scripts/set-app-config.sql}, run through {@code psql} in the
 * test database's own container, as {@code make app-config} runs it.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class AppConfigControllerIT {

	private static final String SCRIPT = "/tmp/set-app-config.sql";

	@Autowired
	private RestTestClient client;

	@Autowired
	private PostgreSQLContainer postgres;

	@BeforeEach
	void copyScript() {
		postgres.copyFileToContainer(
				MountableFile.forHostPath(Path.of("..", "scripts", "set-app-config.sql").toAbsolutePath()), SCRIPT);
	}

	@AfterEach
	void restoreDefaults() {
		assertThat(setConfig("0", "0", "off").getExitCode()).isZero();
	}

	@Test
	void startsWithNoBuildBlockedAndNoMaintenance() {
		String body = readConfig();

		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.ios")).isZero();
		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.android")).isZero();
		assertThat((Boolean) JsonPath.read(body, "$.maintenance")).isFalse();
		assertThat((Object) JsonPath.read(body, "$.length()")).isEqualTo(2);
	}

	@Test
	void answersAnAnonymousCallerAndForbidsCaching() {
		client.get().uri("/api/v1/app-config")
				.exchange()
				.expectStatus().isOk()
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_JSON)
				.expectHeader().valueEquals("Cache-Control", "no-store");
	}

	@Test
	void theOperatorsCommandChangesWhatTheEndpointAnswers() {
		ExecResult result = setConfig("7", "12", "on");
		assertThat(result.getExitCode()).as(result.getStderr()).isZero();

		String body = readConfig();
		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.ios")).isEqualTo(7);
		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.android")).isEqualTo(12);
		assertThat((Boolean) JsonPath.read(body, "$.maintenance")).isTrue();
	}

	@Test
	void aValueTheOperatorLeavesOutKeepsItsCurrentSetting() {
		assertThat(setConfig("7", "12", "on").getExitCode()).isZero();

		ExecResult result = setConfig("", "20", "");
		assertThat(result.getExitCode()).as(result.getStderr()).isZero();

		String body = readConfig();
		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.ios")).isEqualTo(7);
		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.android")).isEqualTo(20);
		assertThat((Boolean) JsonPath.read(body, "$.maintenance")).isTrue();
	}

	@Test
	void aRefusedValueChangesNothing() {
		assertThat(setConfig("7", "12", "on").getExitCode()).isZero();

		for (String[] refused : new String[][] {{"-1", "", ""}, {"abc", "", ""}, {"", "", "maybe"}, {"9", "-3", ""}}) {
			assertThat(setConfig(refused[0], refused[1], refused[2]).getExitCode())
					.as("ios=%s android=%s maintenance=%s", (Object[]) refused).isNotZero();
		}

		String body = readConfig();
		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.ios")).isEqualTo(7);
		assertThat((Integer) JsonPath.read(body, "$.minimumBuild.android")).isEqualTo(12);
		assertThat((Boolean) JsonPath.read(body, "$.maintenance")).isTrue();
	}

	@Test
	void theTableHoldsExactlyOneRow() {
		ExecResult second = psql("INSERT INTO appconfig.app_config (id) VALUES (2)");

		assertThat(second.getExitCode()).isNotZero();
	}

	@Test
	void theSpecNamesBothPlatformsAndTheFlagRequired() {
		String docs = client.get().uri("/v3/api-docs")
				.exchange().expectStatus().isOk()
				.expectBody(String.class).returnResult().getResponseBody();

		assertThat((Object) JsonPath.read(docs, "$.paths['/api/v1/app-config'].get.responses.200")).isNotNull();
		Map<String, Object> operation = JsonPath.read(docs, "$.paths['/api/v1/app-config'].get");
		assertThat(operation).doesNotContainKey("security");
		List<String> config = JsonPath.read(docs, "$.components.schemas.AppConfigDto.required");
		assertThat(config).containsExactlyInAnyOrder("minimumBuild", "maintenance");
		List<String> builds = JsonPath.read(docs, "$.components.schemas.MinimumBuildDto.required");
		assertThat(builds).containsExactlyInAnyOrder("ios", "android");
	}

	private String readConfig() {
		return client.get().uri("/api/v1/app-config")
				.exchange().expectStatus().isOk()
				.expectBody(String.class).returnResult().getResponseBody();
	}

	private ExecResult setConfig(String ios, String android, String maintenance) {
		return exec("psql", "-U", postgres.getUsername(), "-d", postgres.getDatabaseName(),
				"-v", "ios=" + ios, "-v", "android=" + android, "-v", "maintenance=" + maintenance, "-f", SCRIPT);
	}

	private ExecResult psql(String statement) {
		return exec("psql", "-U", postgres.getUsername(), "-d", postgres.getDatabaseName(), "-c", statement);
	}

	private ExecResult exec(String... command) {
		try {
			return postgres.execInContainer(command);
		} catch (IOException | InterruptedException e) {
			throw new IllegalStateException(e);
		}
	}

}
