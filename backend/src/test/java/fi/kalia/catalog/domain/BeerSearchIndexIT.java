package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.application.BeerSearchQuery;
import fi.kalia.catalog.application.CatalogService;
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
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;

// Asserts plans, not results: BeerSpecificationsIT covers what the filters
// return, and an index the planner never picks returns the same rows as one it
// does. The SQL is captured from Hibernate so the plan is of the statement the
// search endpoint really issues. The plans are judged against the migrated
// catalog itself, Wikidata import included: at the seed's 54 beers alone a full
// scan wins whatever indexes exist.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, BeerSearchIndexIT.SqlCaptureConfiguration.class,
		CatalogService.class})
class BeerSearchIndexIT {

	// CatalogController's defaults, so the plan is of the query the endpoint issues.
	private static final Pageable FIRST_PAGE = PageRequest.of(0, 20,
			Sort.by(Sort.Order.asc("name").ignoreCase(), Sort.Order.asc("id")));

	private static final String SORT_INDEX = "beer_lower_name_id_idx";

	@Autowired
	private BeerRepository beers;

	@Autowired
	private CatalogService catalog;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private CapturedSql capturedSql;

	// Statistics as a long-running database would have them; a freshly migrated
	// one has none until autovacuum gets round to it.
	@BeforeEach
	void analyzeTheCatalog() {
		jdbc.execute("ANALYZE catalog.beer");
		jdbc.execute("ANALYZE catalog.brewery");
	}

	// The scale the product owner set for these plans: a catalog that shrank
	// below it has to fail here rather than quietly weaken the plan assertions
	// that follow.
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
	void countryFilterUsesTheCountryCodeIndex() {
		assertEveryStatementUses(new BeerSearchCriteria(null, null, null, "FI", null, null),
				"brewery_country_code_idx");
	}

	@Test
	void unfilteredPageUsesTheIndexOnTheDefaultSort() {
		List<String> statements = capturedSql.of(
				() -> beers.findAll(BeerSpecifications.matching(new BeerSearchCriteria(null, null, null, null, null, null)), FIRST_PAGE));
		String page = statements.stream().filter(sql -> sql.contains("order by")).findFirst().orElseThrow();
		assertThat(page).contains("order by lower(b1_0.name),b1_0.id");
		assertThat(planFor(page)).contains(SORT_INDEX);
	}

	// The search joins this test's transaction, so whatever plan_cache_mode it sets
	// still holds for the probe. Five executions are the custom plans Postgres
	// tries before it may settle on the generic one.
	@Test
	void shortNameCountKeepsItsCustomPlanPastTheGenericPlanThreshold() {
		List<String> statements = capturedSql.of(() -> catalog.searchBeers(
				new BeerSearchQuery("a", null, null, null, null, null), FIRST_PAGE));
		String count = statements.stream().filter(sql -> sql.startsWith("select count")).findFirst().orElseThrow();
		String probe = "count_probe_" + SqlPlans.nextProbeNumber();
		jdbc.execute("PREPARE " + probe + " AS " + SqlPlans.withPostgresPlaceholders(count));
		for (int execution = 0; execution < 5; execution++) {
			jdbc.queryForList("EXECUTE " + probe + "('%a%')");
		}
		String plan = String.join("\n", jdbc.queryForList("EXPLAIN EXECUTE " + probe + "('%a%')", String.class));
		assertThat(plan).doesNotContain("beer_name_trgm_idx");
	}

	// A custom plan can be a parallel hash join, whose shared memory a default
	// Docker /dev/shm runs out of under concurrent searches: only a term with no
	// trigrams is worth that.
	@Test
	void searchesWithTrigramsKeepThePlanCacheDefault() {
		catalog.searchBeers(new BeerSearchQuery("ale", null, null, null, null, null), FIRST_PAGE);
		catalog.searchBeers(new BeerSearchQuery(null, null, null, null, null, null),
				PageRequest.of(0, 20, Sort.by(Sort.Order.desc("abv"), Sort.Order.asc("id"))));
		assertThat(jdbc.queryForObject("SHOW plan_cache_mode", String.class)).isEqualTo("auto");
	}

	// The count as well as the page, because a full page makes Spring Data issue
	// one, and it scans every match rather than 20. The page may instead walk the
	// sort index and stop at 20 matches, which is no scan of the table either.
	private void assertEveryStatementUses(BeerSearchCriteria criteria, String index) {
		List<String> statements = capturedSql.of(
				() -> beers.findAll(BeerSpecifications.matching(criteria), FIRST_PAGE));
		assertThat(statements).isNotEmpty();
		assertThat(statements).allSatisfy(sql -> {
			if (sql.startsWith("select count")) {
				assertThat(planFor(sql)).contains(index);
			} else {
				assertThat(planFor(sql)).containsAnyOf(index, SORT_INDEX);
			}
		});
	}

	private String planFor(String sql) {
		return SqlPlans.planFor(jdbc, sql);
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
