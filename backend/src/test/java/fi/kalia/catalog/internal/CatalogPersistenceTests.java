package fi.kalia.catalog.internal;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class CatalogPersistenceTests {

	@Autowired
	private BeerRepository beers;

	@Autowired
	private BreweryRepository breweries;

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
		assertThat(beer.getPrice().currency()).isEqualTo("EUR");
	}

	@Test
	void persistsAndReloadsABeer() {
		Brewery brewery = breweries.save(Brewery.create("Test Brewery", "Finland", "Helsinki"));
		Beer saved = beers.save(Beer.create(
				brewery, "Test IPA", "IPA", new BigDecimal("6.5"),
				"A test beer", new Money(590, "EUR")));

		Beer reloaded = beers.findById(saved.getId()).orElseThrow();

		assertThat(reloaded.getName()).isEqualTo("Test IPA");
		assertThat(reloaded.getPrice()).isEqualTo(new Money(590, "EUR"));
		assertThat(reloaded.getCreatedAt()).isNotNull();
	}

}
