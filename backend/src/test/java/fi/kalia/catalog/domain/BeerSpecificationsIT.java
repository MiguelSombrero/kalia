package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.jspecify.annotations.Nullable;

// Runs against the real migrated catalog, seed and Wikidata import alike:
// mocking the JPA Criteria API would assert implementation calls, not filtering
// behavior. Totals are read from the database rather than pinned, since the
// import's size is the snapshot's business; seeded identities stay exact.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class BeerSpecificationsIT {

	@Autowired
	private BeerRepository beers;

	@Autowired
	private BreweryRepository breweries;

	@Autowired
	private JdbcTemplate jdbc;

	private long count(String sql) {
		return jdbc.queryForObject(sql, Long.class);
	}

	private List<Beer> search(@Nullable String query, @Nullable String style, @Nullable UUID breweryId,
			@Nullable String country, @Nullable BigDecimal minAbv, @Nullable BigDecimal maxAbv) {
		return beers.findAll(BeerSpecifications.matching(
				new BeerSearchCriteria(query, style, breweryId, country, minAbv, maxAbv)));
	}

	@Test
	void emptyCriteriaMatchesEverything() {
		long total = count("SELECT count(*) FROM catalog.beer");

		assertThat(search(null, null, null, null, null, null)).hasSize((int) total);
		assertThat(search("  ", "", null, " ", null, null)).hasSize((int) total);
	}

	@Test
	void nameQueryIsCaseInsensitiveSubstringMatch() {
		assertThat(search("WESTVLETEREN", null, null, null, null, null)).hasSize(3);
		assertThat(search("vleteren", null, null, null, null, null)).hasSize(3);
		assertThat(search("does-not-exist", null, null, null, null, null)).isEmpty();
	}

	@Test
	void styleFilterIsCaseInsensitiveExactMatch() {
		List<Beer> ipas = search(null, "ipa", null, null, null, null);

		assertThat(ipas).isNotEmpty();
		// Exact match: "IPA" must not swallow "Session IPA" or "Double IPA".
		assertThat(ipas).allSatisfy(beer -> assertThat(beer.getStyle()).isEqualTo("IPA"));
	}

	@Test
	void countryFilterMatchesBreweryCountryCaseInsensitively() {
		List<Beer> finnish = search(null, null, null, "finland", null, null);

		assertThat(finnish).hasSize((int) count("""
				SELECT count(*) FROM catalog.beer b JOIN catalog.brewery br ON br.id = b.brewery_id
				WHERE br.country = 'Finland'"""));
		assertThat(finnish).isNotEmpty().allSatisfy(
				beer -> assertThat(beer.getBrewery().getCountry()).isEqualTo("Finland"));
	}

	@Test
	void breweryIdFilterMatchesOnlyThatBrewery() {
		Brewery westvleteren = breweries.findAll().stream()
				.filter(b -> b.getName().equals("Brouwerij Westvleteren"))
				.findFirst().orElseThrow();

		List<Beer> result = search(null, null, westvleteren.getId(), null, null, null);

		assertThat(result).hasSize(3);
		assertThat(result).allSatisfy(
				beer -> assertThat(beer.getBrewery().getId()).isEqualTo(westvleteren.getId()));
	}

	@Test
	void abvBoundsAreInclusive() {
		BigDecimal strongest = jdbc.queryForObject("SELECT max(abv) FROM catalog.beer", BigDecimal.class);
		BigDecimal weakest = jdbc.queryForObject("SELECT min(abv) FROM catalog.beer", BigDecimal.class);

		assertThat(search(null, null, null, null, strongest, null)).isNotEmpty()
				.allSatisfy(beer -> assertThat(beer.getAbv()).isEqualByComparingTo(strongest));
		assertThat(search(null, null, null, null, null, weakest)).isNotEmpty()
				.allSatisfy(beer -> assertThat(beer.getAbv()).isEqualByComparingTo(weakest));
	}

	@Test
	void combinedCriteriaUseAndSemantics() {
		List<Beer> strongBelgianQuads = search(null, "Quadrupel", null, "Belgium",
				new BigDecimal("10"), null);

		assertThat(strongBelgianQuads).hasSize((int) count("""
				SELECT count(*) FROM catalog.beer b JOIN catalog.brewery br ON br.id = b.brewery_id
				WHERE b.style = 'Quadrupel' AND br.country = 'Belgium' AND b.abv >= 10"""));
		assertThat(strongBelgianQuads).allSatisfy(beer -> {
			assertThat(beer.getStyle()).isEqualTo("Quadrupel");
			assertThat(beer.getBrewery().getCountry()).isEqualTo("Belgium");
			assertThat(beer.getAbv()).isGreaterThanOrEqualTo(new BigDecimal("10"));
		});
		assertThat(strongBelgianQuads).extracting(Beer::getName)
				.contains("Westvleteren 12", "Rochefort 10", "St. Bernardus Abt 12");
	}

	@Test
	void percentInQueryIsTreatedAsLiteralNotWildcard() {
		// Unescaped, "%" is a SQL wildcard and "10%" would match "100%"/"10" too.
		assertThat(search("10%", null, null, null, null, null)).isEmpty();
	}

	@Test
	void underscoreInQueryIsTreatedAsLiteralNotWildcard() {
		// Unescaped, "_" matches any single character and would match every beer.
		assertThat(search("_", null, null, null, null, null)).isEmpty();
	}

}
