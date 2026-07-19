package fi.kalia.catalog.internal;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.BeerSearchCriteria;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.jspecify.annotations.Nullable;

/**
 * Specification behavior against the real database and seed data — mocking
 * the JPA Criteria API would only assert implementation calls, not filtering.
 */
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class BeerSpecificationsTests {

	@Autowired
	private BeerRepository beers;

	@Autowired
	private BreweryRepository breweries;

	private List<Beer> search(@Nullable String query, @Nullable String style, @Nullable UUID breweryId,
			@Nullable String country, @Nullable BigDecimal minAbv, @Nullable BigDecimal maxAbv) {
		return beers.findAll(BeerSpecifications.matching(
				new BeerSearchCriteria(query, style, breweryId, country, minAbv, maxAbv)));
	}

	@Test
	void emptyCriteriaMatchesEverything() {
		assertThat(search(null, null, null, null, null, null)).hasSize(54);
		assertThat(search("  ", "", null, " ", null, null)).hasSize(54);
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

		assertThat(finnish).hasSize(3);
		assertThat(finnish).allSatisfy(
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
		// KBS is exactly 12.0 — the strongest seed beer.
		assertThat(search(null, null, null, null, new BigDecimal("12.0"), null))
				.extracting(Beer::getName).containsExactly("KBS");
		// Table Beer is exactly 3.0 — the weakest.
		assertThat(search(null, null, null, null, null, new BigDecimal("3.0")))
				.extracting(Beer::getName).containsExactly("Table Beer");
	}

	@Test
	void combinedCriteriaUseAndSemantics() {
		List<Beer> strongBelgianQuads = search(null, "Quadrupel", null, "Belgium",
				new BigDecimal("10"), null);

		assertThat(strongBelgianQuads).extracting(Beer::getName)
				.containsExactlyInAnyOrder("Westvleteren 12", "Rochefort 10", "St. Bernardus Abt 12");
	}

}
