package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class CatalogPersistenceIT {

	@Autowired
	private BeerRepository beers;

	@Autowired
	private BreweryRepository breweries;

	@Autowired
	private JdbcTemplate jdbc;

	@Test
	void seedDataProvidesAtLeastFiftyBeers() {
		assertThat(beers.count()).isGreaterThanOrEqualTo(50);
		assertThat(breweries.count()).isGreaterThanOrEqualTo(15);
	}

	@Test
	void seedDataContainsWestvleteren12() {
		Beer beer = beers.findAll().stream()
				.filter(b -> b.getName().equals("Westvleteren 12"))
				.findFirst()
				.orElseThrow();

		assertThat(beer.getStyle()).isEqualTo("Quadrupel");
		assertThat(beer.getAbv()).isEqualByComparingTo(new BigDecimal("10.2"));
		assertThat(beer.getBrewery().getName()).isEqualTo("Brouwerij Westvleteren");
	}

	@Test
	void persistsAndReloadsABeer() {
		Brewery brewery = breweries.save(Brewery.create("Test Brewery", "FI", "Helsinki"));
		Beer saved = beers.save(Beer.create(
				brewery, "Test IPA", "IPA", new BigDecimal("6.5"), "A test beer"));

		Beer reloaded = beers.findById(saved.getId()).orElseThrow();

		assertThat(reloaded.getName()).isEqualTo("Test IPA");
		assertThat(reloaded.getCreatedAt()).isNotNull();
	}

	// The entities do not map source: a row the app writes is marked by the
	// column default V008 sets, which nothing in Java would notice changing.
	@Test
	void aRowTheAppInsertsIsMarkedUserAddedWithNoQid() {
		Brewery brewery = breweries.saveAndFlush(Brewery.create("Test Brewery", "FI", null));
		Beer beer = beers.saveAndFlush(Beer.create(brewery, "Test IPA", "IPA", new BigDecimal("6.5"), null));

		assertThat(provenance("catalog.brewery", brewery.getId()))
				.containsEntry("source", "USER").containsEntry("wikidata_qid", null);
		assertThat(provenance("catalog.beer", beer.getId()))
				.containsEntry("source", "USER").containsEntry("wikidata_qid", null);
	}

	// The index, not ContributionService's own check, is what holds under
	// concurrent inserts: this saves straight through the repository.
	@Test
	void theDatabaseRefusesASecondBeerOfTheSameFoldedNameAtOneBrewery() {
		Brewery brewery = breweries.saveAndFlush(Brewery.create("Test Brewery", "FI", null));
		beers.saveAndFlush(Beer.create(brewery, "Test I.P.A.", "IPA", new BigDecimal("6.5"), null));

		assertThatThrownBy(() -> beers.saveAndFlush(
				Beer.create(brewery, " test ipa", "IPA", new BigDecimal("6.5"), null)))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void theDatabaseRefusesAContributorOnARowNotUserAdded() {
		assertThatThrownBy(() -> jdbc.update(
				"UPDATE catalog.beer SET contributor_id = gen_random_uuid() WHERE source = 'WIKIDATA'"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void everyBreweryIsInAListedCountryAndNoColumnNamesOne() {
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.brewery WHERE country_code IS NULL", Long.class))
				.isZero();
		assertThat(jdbc.queryForList("SELECT DISTINCT country_code FROM catalog.brewery", String.class))
				.isNotEmpty().allSatisfy(code -> assertThat(Country.isListed(code)).as(code).isTrue());
		assertThat(jdbc.queryForList("""
				SELECT column_name FROM information_schema.columns
				WHERE table_schema = 'catalog' AND column_name LIKE '%country%'""", String.class))
				.containsExactly("country_code");
	}

	@Test
	void theDatabaseRefusesACountryCodeThatIsNotTwoCapitals() {
		assertThatThrownBy(() -> jdbc.update(
				"UPDATE catalog.brewery SET country_code = 'Finland' WHERE source = 'SEED'"))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	private Map<String, Object> provenance(String table, UUID id) {
		return jdbc.queryForMap("SELECT source, wikidata_qid FROM " + table + " WHERE id = ?", id);
	}

}
