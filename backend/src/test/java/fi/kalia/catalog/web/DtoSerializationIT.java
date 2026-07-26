package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;

/**
 * Jackson serializes nulls literally unless configured otherwise, and a
 * present {@code "city": null} does not match the {@code city?: string}
 * the generated frontend types promise. Verifies the configured
 * ObjectMapper omits null fields entirely.
 */
@JsonTest
class DtoSerializationIT {

	@Autowired
	private JacksonTester<BeerDetailsDto> beerDetailsJson;

	@Autowired
	private JacksonTester<BreweryDto> breweryJson;

	@Test
	void omitsNullDescriptionFromBeerDetailsJson() throws Exception {
		BeerDetailsDto beer = new BeerDetailsDto(UUID.randomUUID(), "Test Beer", "IPA",
				new BigDecimal("5.0"), null, new MoneyDto(500, "EUR"),
				new BreweryDto(UUID.randomUUID(), "Test Brewery", "Finland", null));

		String json = beerDetailsJson.write(beer).getJson();

		assertThat(json).doesNotContain("description");
	}

	@Test
	void omitsNullCityFromBreweryJson() throws Exception {
		BreweryDto brewery = new BreweryDto(UUID.randomUUID(), "Test Brewery", "Finland", null);

		String json = breweryJson.write(brewery).getJson();

		assertThat(json).doesNotContain("city");
	}

}
