package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.application.CatalogService;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;

// The brewery list and its search cut their page in SQL (ADR-0087). Plans are
// judged against the migrated catalog, Wikidata import included, as
// BeerSearchIndexIT's are, and the order against the Java comparator it replaced.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, BeerSearchIndexIT.SqlCaptureConfiguration.class,
		CatalogService.class})
class BreweryReadIT {

	private static final int PAGE_SIZE = 20;

	private static final String SORT_INDEX = "brewery_name_sort_key_idx";

	private static final String TRIGRAM_INDEX = "brewery_name_trgm_idx";

	@Autowired
	private BreweryRepository breweries;

	@Autowired
	private CatalogService catalog;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private BeerSearchIndexIT.CapturedSql capturedSql;

	@BeforeEach
	void analyzeTheCatalog() {
		jdbc.execute("ANALYZE catalog.brewery");
	}

	@Test
	void catalogIsSeededToTheScaleThePlansAreJudgedAt() {
		assertThat(breweries.count()).isGreaterThanOrEqualTo(4_000);
	}

	@Test
	void everyBreweryCarriesTheKeyTheApplicationWouldGiveItsName() {
		List<Map<String, Object>> rows = jdbc.queryForList("SELECT name, name_sort_key FROM catalog.brewery");
		assertThat(rows).isNotEmpty().allSatisfy(row -> assertThat(row.get("name_sort_key"))
				.as("%s", row.get("name")).isEqualTo(BrewerySortKey.of((String) row.get("name"))));
	}

	@Test
	void theListPageIsReadOffTheSortKeyIndex() {
		List<String> statements = capturedSql.of(() -> breweries.findPage(null, PageRequest.of(2, PAGE_SIZE)));
		assertThat(statements).hasSize(2);
		assertThat(statements.get(0)).contains("order by b1_0.name_sort_key,b1_0.id").contains("offset ? rows");
		assertThat(planFor(statements.get(0))).contains(SORT_INDEX).doesNotContain("Sort");
		assertThat(statements.get(1)).startsWith("select count");
	}

	@Test
	void aSearchPageAndItsCountAreReadThroughAnIndex() {
		List<String> statements = capturedSql.of(
				() -> breweries.findPageByNameContaining("brasserie", null, PageRequest.of(0, PAGE_SIZE)));
		assertThat(statements).isNotEmpty();
		assertThat(statements).allSatisfy(sql -> {
			String plan = planFor(sql);
			if (sql.startsWith("select count")) {
				assertThat(plan).contains(TRIGRAM_INDEX);
			} else {
				assertThat(plan).containsAnyOf(TRIGRAM_INDEX, SORT_INDEX);
			}
		});
	}

	@Test
	void theWholeListComesBackInStringCaseInsensitiveOrder() {
		List<String> expected = breweries.findAll().stream().map(Brewery::getName)
				.sorted(String.CASE_INSENSITIVE_ORDER).toList();
		List<String> paged = new ArrayList<>();
		Page<Brewery> page;
		int number = 0;
		do {
			page = breweries.findPage(null, PageRequest.of(number++, 1000));
			page.forEach(brewery -> paged.add(brewery.getName()));
		} while (page.hasNext());
		assertThat(paged).hasSameSizeAs(expected);
		for (int i = 0; i < expected.size(); i++) {
			assertThat(String.CASE_INSENSITIVE_ORDER.compare(paged.get(i), expected.get(i)))
					.as("position %d: %s against %s", i, paged.get(i), expected.get(i)).isZero();
		}
	}

	// Each pair is one a database collation can order the other way: punctuation
	// ignored or ranked after letters, accents folded into their base letter.
	@Test
	void punctuationAndAccentsOrderByCodePointAfterCaseFolding() {
		List<String> added = List.of("Zqx Éclair", "Zqx d'Orval", "Zqx de Rochefort", "Zqx Põhjala", "Zqx Pohjola",
				"Zqx Äpple", "Zqx _under", "Zqx 10 Barrels", "ZQX ZEBRA", "Zqx zebra works", "Zqx-Dash");
		added.forEach(name -> breweries.save(Brewery.create(name, "FI", null)));
		breweries.flush();

		Page<Brewery> found = catalog.listBreweries("zqx", null, PageRequest.of(0, 100));

		assertThat(found.map(Brewery::getName)).containsExactly("Zqx 10 Barrels", "Zqx _under", "Zqx d'Orval",
				"Zqx de Rochefort", "Zqx Pohjola", "Zqx Põhjala", "ZQX ZEBRA", "Zqx zebra works", "Zqx Äpple",
				"Zqx Éclair", "Zqx-Dash");
	}

	@Test
	void theSearchTakesLikeWildcardsLiterally() {
		breweries.saveAndFlush(Brewery.create("Zw 100% Brewing", "FI", null));
		breweries.saveAndFlush(Brewery.create("Zw 100x Brewing", "FI", null));

		assertThat(catalog.listBreweries("100%", null, PageRequest.of(0, 20)).map(Brewery::getName))
				.containsExactly("Zw 100% Brewing");
		assertThat(catalog.listBreweries("zw 100_", null, PageRequest.of(0, 20)).getTotalElements()).isZero();
	}

	@Test
	void aPageReportsTheTotalAndHonoursThePageNumber() {
		Page<Brewery> second = catalog.listBreweries(null, null, PageRequest.of(1, 5));
		assertThat(second.getTotalElements()).isEqualTo(breweries.count());
		assertThat(second.getContent()).hasSize(5);
		assertThat(catalog.listBreweries("  ", null, PageRequest.of(1, 5)).getContent())
				.isEqualTo(second.getContent());
	}

	private String planFor(String sql) {
		return SqlPlans.planFor(jdbc, sql);
	}

}
