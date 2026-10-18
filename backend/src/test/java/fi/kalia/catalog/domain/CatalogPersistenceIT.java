package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
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
		Brewery brewery = breweries.save(Brewery.create("Test Brewery", "Finland", "Helsinki"));
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
		Brewery brewery = breweries.saveAndFlush(Brewery.create("Test Brewery", "Finland", null));
		Beer beer = beers.saveAndFlush(Beer.create(brewery, "Test IPA", "IPA", new BigDecimal("6.5"), null));

		assertThat(provenance("catalog.brewery", brewery.getId()))
				.containsEntry("source", "USER").containsEntry("wikidata_qid", null);
		assertThat(provenance("catalog.beer", beer.getId()))
				.containsEntry("source", "USER").containsEntry("wikidata_qid", null);
	}

	private Map<String, Object> provenance(String table, UUID id) {
		return jdbc.queryForMap("SELECT source, wikidata_qid FROM " + table + " WHERE id = ?", id);
	}

}
