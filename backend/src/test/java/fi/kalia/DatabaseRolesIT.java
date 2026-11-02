package fi.kalia;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import org.testcontainers.utility.MountableFile;

/**
 * The three database roles of ADR-0100, created by the real
 * {@code postgres/init} script, which Postgres runs the way the stack does:
 * on an empty data directory, as the bootstrap superuser. The application
 * connects as the runtime role and Flyway as the owner, so a green context
 * is itself the proof that migrations still run at start-up.
 */
@SpringBootTest
class DatabaseRolesIT {

	private static final String OWNER_PASSWORD = "owner-password";

	private static final String APP_PASSWORD = "app-password";

	private static final String KEYCLOAK_PASSWORD = "keycloak-password";

	private static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer(DockerImageName.parse("postgres:18.4"))
			.withDatabaseName("kalia")
			.withUsername("kalia")
			.withPassword("bootstrap-password")
			.withEnv("DATABASE_OWNER_PASSWORD", OWNER_PASSWORD)
			.withEnv("DATABASE_PASSWORD", APP_PASSWORD)
			.withEnv("KEYCLOAK_DB_PASSWORD", KEYCLOAK_PASSWORD)
			.withCopyFileToContainer(
					MountableFile.forHostPath(Path.of("..", "postgres", "init").toAbsolutePath()),
					"/docker-entrypoint-initdb.d");

	static {
		POSTGRES.start();
	}

	@DynamicPropertySource
	static void connectAsTheRolesTheStackUses(DynamicPropertyRegistry registry) {
		registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
		registry.add("spring.datasource.username", () -> "kalia_app");
		registry.add("spring.datasource.password", () -> APP_PASSWORD);
		registry.add("spring.flyway.user", () -> "kalia_owner");
		registry.add("spring.flyway.password", () -> OWNER_PASSWORD);
	}

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@Test
	void theApplicationConnectsAsTheRuntimeRole() {
		assertThat(jdbc.queryForObject("SELECT current_user", String.class)).isEqualTo("kalia_app");
	}

	@Test
	void flywayCreatedEveryModuleTableAsTheOwner() {
		List<String> owners = jdbc.queryForList("""
				SELECT DISTINCT tableowner FROM pg_tables
				WHERE schemaname IN ('catalog', 'cellar', 'profile', 'feed', 'appconfig', 'public')
				""", String.class);

		assertThat(owners).containsExactly("kalia_owner");
	}

	@Test
	void theRuntimeRoleReadsAndWritesRows() {
		assertThat(jdbc.update("UPDATE appconfig.app_config SET maintenance = true")).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT maintenance FROM appconfig.app_config", Boolean.class)).isTrue();
		assertThat(jdbc.update("UPDATE appconfig.app_config SET maintenance = false")).isEqualTo(1);
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.beer", Long.class)).isPositive();
	}

	@Test
	void theRuntimeRoleCannotDropOrChangeATable() {
		assertRefused("DROP TABLE appconfig.app_config", "must be owner");
		assertRefused("ALTER TABLE appconfig.app_config ADD COLUMN extra text", "must be owner");
		assertRefused("TRUNCATE appconfig.app_config", "permission denied");
		assertRefused("CREATE TABLE appconfig.extra (id int)", "permission denied");
		assertRefused("CREATE TABLE public.extra (id int)", "permission denied");
		assertRefused("DROP SCHEMA appconfig CASCADE", "must be owner");
	}

	@Test
	void keycloakReachesItsOwnDatabaseAndNotKalias() throws SQLException {
		try (Connection connection = connect("keycloak", "keycloak", KEYCLOAK_PASSWORD);
				Statement statement = connection.createStatement()) {
			statement.execute("CREATE TABLE realm_probe (id int)");
			statement.execute("DROP TABLE realm_probe");
		}

		assertThatThrownBy(() -> connect("kalia", "keycloak", KEYCLOAK_PASSWORD))
				.isInstanceOf(SQLException.class)
				.hasMessageContaining("permission denied for database");
	}

	@Test
	void theApplicationRolesCannotReachKeycloaksDatabase() {
		assertThatThrownBy(() -> connect("keycloak", "kalia_app", APP_PASSWORD)).isInstanceOf(SQLException.class)
				.hasMessageContaining("permission denied for database");
		assertThatThrownBy(() -> connect("keycloak", "kalia_owner", OWNER_PASSWORD)).isInstanceOf(SQLException.class)
				.hasMessageContaining("permission denied for database");
	}

	private void assertRefused(String sql, String reason) {
		assertThatThrownBy(() -> jdbc.execute(sql)).isInstanceOf(DataAccessException.class)
				.rootCause().hasMessageContaining(reason);
	}

	private static Connection connect(String database, String user, String password) throws SQLException {
		String url = "jdbc:postgresql://%s:%d/%s".formatted(POSTGRES.getHost(), POSTGRES.getMappedPort(5432), database);
		return DriverManager.getConnection(url, user, password);
	}

}
