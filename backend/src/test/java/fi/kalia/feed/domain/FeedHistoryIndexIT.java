package fi.kalia.feed.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.cfg.AvailableSettings;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

// Asserts how many rows each read touches, not what it returns: FeedServiceIT
// and FeedControllerIT cover the pages. Rows touched, taken from EXPLAIN ANALYZE,
// is a count the data fixes, so it needs no clock; a plan that walks every older
// line to find the few in the window touches them all. The SQL is captured from
// Hibernate so the plan is of the statement the feed endpoint really issues.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, FeedHistoryIndexIT.SqlCaptureConfiguration.class})
class FeedHistoryIndexIT {

	private static final int OLDER_LINES = 20_000;

	// Fewer than a page, as on a quiet instance: a read that finds a page's worth
	// in the window stops there however it walks.
	private static final int LINES_IN_WINDOW = 10;

	private static final int PAGE_SIZE = 20;

	// Far below the older lines and above a page, so a plan may read the window's
	// lines and a page's worth more but not the history.
	private static final int TOUCHED_BOUND = 500;

	@Autowired
	private FeedLineRepository lines;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private CapturedSql capturedSql;

	private Instant cutoff;

	@BeforeEach
	void aQuietInstanceWithALongHistory() {
		Instant now = Instant.now();
		cutoff = now.minus(30, ChronoUnit.DAYS);
		insertLines(OLDER_LINES, now.minus(400, ChronoUnit.DAYS), now.minus(100, ChronoUnit.DAYS));
		insertLines(LINES_IN_WINDOW, now.minus(10, ChronoUnit.DAYS), now);
		jdbc.execute("ANALYZE feed.line");
	}

	@Test
	void frontPageTouchesTheLinesInTheWindowNotTheHistory() {
		List<String> statements = capturedSql.of(() -> lines
				.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(cutoff, PageRequest.of(0, PAGE_SIZE + 1)));
		assertThat(statements).hasSize(1);
		String plan = explainAnalyze(statements.getFirst(), literal(cutoff), String.valueOf(PAGE_SIZE + 1));
		assertThat(rowsTouched(plan)).as(plan).isLessThan(TOUCHED_BOUND);
	}

	@Test
	void beforeCursorNearTheWindowEdgeTouchesTheLinesInTheWindowNotTheHistory() {
		long fewLinesBelow = jdbc.queryForObject("""
				SELECT sequence_number FROM feed.line WHERE occurred_at >= ?
				ORDER BY sequence_number OFFSET 5 LIMIT 1""", Long.class, java.sql.Timestamp.from(cutoff));
		List<String> statements = capturedSql.of(() -> lines
				.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(fewLinesBelow,
						cutoff, PageRequest.of(0, PAGE_SIZE + 1)));
		assertThat(statements).hasSize(1);
		String plan = explainAnalyze(statements.getFirst(), String.valueOf(fewLinesBelow), literal(cutoff),
				String.valueOf(PAGE_SIZE + 1));
		assertThat(rowsTouched(plan)).as(plan).isLessThan(TOUCHED_BOUND);
	}

	// Lines spread evenly from first to last, inserted in time order so that the
	// sequence number follows occurred_at as it does on a live instance.
	private void insertLines(int count, Instant first, Instant last) {
		jdbc.update("""
				INSERT INTO feed.line (event_id, user_id, beer_id, quantity, occurred_at)
				SELECT gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), 1,
				       ?::timestamptz + (?::timestamptz - ?::timestamptz) * n / ?
				FROM generate_series(1, ?) AS n ORDER BY n""",
				java.sql.Timestamp.from(first), java.sql.Timestamp.from(last), java.sql.Timestamp.from(first),
				count, count);
	}

	private static String literal(Instant instant) {
		return "'" + instant + "'::timestamptz";
	}

	private String explainAnalyze(String sql, String... arguments) {
		String probe = "feed_probe_" + System.nanoTime();
		jdbc.execute("PREPARE " + probe + " AS " + withPostgresPlaceholders(sql));
		return jdbc.queryForObject("EXPLAIN (ANALYZE, FORMAT JSON, TIMING OFF) EXECUTE " + probe + "("
				+ String.join(", ", arguments) + ")", String.class);
	}

	private static String withPostgresPlaceholders(String sql) {
		StringBuilder rewritten = new StringBuilder(sql.length());
		int parameter = 0;
		for (char character : sql.toCharArray()) {
			if (character == '?') {
				rewritten.append('$').append(++parameter);
			} else {
				rewritten.append(character);
			}
		}
		return rewritten.toString();
	}

	// Every row a scan node read: the ones it returned and the ones its filter threw away.
	private static long rowsTouched(String explainJson) {
		return touchedBy(JsonMapper.builder().build().readTree(explainJson).get(0).get("Plan"));
	}

	private static long touchedBy(JsonNode node) {
		long touched = 0;
		if (node.get("Node Type").asString().endsWith("Scan")) {
			long loops = node.get("Actual Loops").asLong();
			touched += (node.get("Actual Rows").asLong() + node.path("Rows Removed by Filter").asLong()) * loops;
		}
		for (JsonNode child : node.path("Plans")) {
			touched += touchedBy(child);
		}
		return touched;
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
