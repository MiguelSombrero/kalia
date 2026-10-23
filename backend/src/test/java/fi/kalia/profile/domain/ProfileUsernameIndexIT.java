package fi.kalia.profile.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.hibernate.cfg.AvailableSettings;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

// The SQL is captured from Hibernate so the plan is of the statement the
// repository really issues: a lookup whose expression the index does not
// match returns the same rows, just by scanning the table.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, ProfileUsernameIndexIT.SqlCaptureConfiguration.class})
class ProfileUsernameIndexIT {

	private static final String INDEX = "profile_username_lower_key";

	@Autowired
	private ProfileRepository profiles;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private CapturedSql capturedSql;

	@Test
	void theIndexIsUniqueOverTheLowerCasedUsername() {
		Map<String, Object> index = jdbc.queryForMap(
				"SELECT indexdef FROM pg_indexes WHERE schemaname = 'profile' AND indexname = ?", INDEX);

		assertThat((String) index.get("indexdef"))
				.isEqualTo("CREATE UNIQUE INDEX " + INDEX + " ON profile.profile USING btree (lower(username))");
	}

	// enable_seqscan off, because a test database holds a handful of profiles
	// and at that size a full scan wins whatever indexes exist; turned off, the
	// planner still falls back to one when no index matches the expression.
	@Test
	void theUsernameLookupUsesTheIndex() {
		List<String> statements = capturedSql.of(() -> profiles.findByUsernameIgnoringCase("alice"));

		assertThat(statements).hasSize(1);
		jdbc.execute("SET LOCAL enable_seqscan = off");
		String plan = String.join("\n",
				jdbc.queryForList("EXPLAIN " + statements.getFirst().replace("?", "'alice'"), String.class));
		assertThat(plan).contains(INDEX);
	}

	@TestConfiguration(proxyBeanMethods = false)
	static class SqlCaptureConfiguration {

		@Bean
		CapturedSql capturedSql() {
			return new CapturedSql();
		}

		@Bean
		HibernatePropertiesCustomizer sqlCaptureCustomizer(CapturedSql capturedSql) {
			return properties -> properties.put(AvailableSettings.STATEMENT_INSPECTOR, capturedSql);
		}

	}

	static class CapturedSql implements StatementInspector {

		private final List<String> statements = new ArrayList<>();

		@Override
		public String inspect(String sql) {
			this.statements.add(sql);
			return sql;
		}

		List<String> of(Runnable query) {
			this.statements.clear();
			query.run();
			return List.copyOf(this.statements);
		}

	}

}
