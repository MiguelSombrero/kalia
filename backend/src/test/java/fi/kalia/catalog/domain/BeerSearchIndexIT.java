package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;
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
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

// Asserts plans, not results: BeerSpecificationsIT covers what the filters
// return, and an index the planner never picks returns the same rows as one it
// does. The SQL is captured from Hibernate so the plan is of the statement the
// search endpoint really issues, and the catalog is grown past the seed data's
// 54 beers because at that size a full scan wins whatever indexes exist.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, BeerSearchIndexIT.SqlCaptureConfiguration.class})
class BeerSearchIndexIT {

	private static final int SEEDED_BREWERIES = 2_000;

	private static final int SEEDED_BEERS = 10_000;

	// CatalogController's defaults, so the plan is of the query the endpoint issues.
	private static final Pageable FIRST_PAGE = PageRequest.of(0, 20,
			Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id")));

	private static final AtomicInteger PROBE_COUNT = new AtomicInteger();

	@Autowired
	private BeerRepository beers;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private CapturedSql capturedSql;

	@BeforeEach
	void growTheCatalog() {
		jdbc.update("""
				INSERT INTO catalog.brewery (name, country)
				SELECT 'Seeded Brewery ' || g,
				       (ARRAY['Belgium', 'Germany', 'USA', 'Finland', 'Czechia'])[1 + (g % 5)]
				FROM generate_series(1, ?) g
				""", SEEDED_BREWERIES);
		jdbc.update("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, price_cents, currency)
				SELECT b.id, 'Seeded Beer ' || g,
				       (ARRAY['IPA', 'Stout', 'Lager', 'Pilsner', 'Saison'])[1 + (g % 5)],
				       5.0, 500, 'EUR'
				FROM generate_series(1, ?) g
				JOIN catalog.brewery b ON b.name = 'Seeded Brewery ' || (1 + (g % ?))
				""", SEEDED_BEERS, SEEDED_BREWERIES);
		jdbc.execute("ANALYZE catalog.beer");
		jdbc.execute("ANALYZE catalog.brewery");
	}

	// The literal is the scale the product owner set for this task, deliberately
	// not SEEDED_BEERS: shrinking the fixture to speed the suite up has to fail
	// here rather than quietly weaken the three plan assertions below.
	@Test
	void catalogIsSeededToTheScaleTheIndexesAreJudgedAt() {
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.beer", Long.class))
				.isGreaterThanOrEqualTo(10_000);
	}

	@Test
	void nameFilterUsesTheTrigramIndex() {
		assertEveryStatementUses(new BeerSearchCriteria("vleteren", null, null, null, null, null),
				"beer_name_trgm_idx");
	}

	@Test
	void styleFilterUsesTheCaseInsensitiveIndex() {
		assertEveryStatementUses(new BeerSearchCriteria(null, "IPA", null, null, null, null),
				"beer_style_lower_idx");
	}

	@Test
	void countryFilterUsesTheCaseInsensitiveIndex() {
		assertEveryStatementUses(new BeerSearchCriteria(null, null, null, "Finland", null, null),
				"brewery_country_lower_idx");
	}

	// Every statement, because a full page makes Spring Data issue a count query
	// alongside the page itself, and that one scans every match rather than 20.
	private void assertEveryStatementUses(BeerSearchCriteria criteria, String index) {
		List<String> statements = capturedSql.of(
				() -> beers.findAll(BeerSpecifications.matching(criteria), FIRST_PAGE));
		assertThat(statements).isNotEmpty();
		assertThat(statements).allSatisfy(sql -> assertThat(planFor(sql)).contains(index));
	}

	private String planFor(String sql) {
		int parameters = (int) sql.chars().filter(character -> character == '?').count();
		String probe = "index_probe_" + PROBE_COUNT.incrementAndGet();
		// PREPARE rather than EXPLAIN (GENERIC_PLAN) on the SQL directly: pgjdbc sends
		// every statement over the extended protocol, where a free $1 is a bind
		// parameter it has no value for. Postgres infers each parameter's type from
		// the statement it appears in, and force_generic_plan keeps the NULLs passed
		// for them out of the plan.
		jdbc.execute("SET LOCAL plan_cache_mode = force_generic_plan");
		jdbc.execute("PREPARE " + probe + " AS " + withPostgresPlaceholders(sql));
		String arguments = String.join(", ", Collections.nCopies(parameters, "NULL"));
		return String.join("\n",
				jdbc.queryForList("EXPLAIN EXECUTE " + probe + "(" + arguments + ")", String.class));
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
