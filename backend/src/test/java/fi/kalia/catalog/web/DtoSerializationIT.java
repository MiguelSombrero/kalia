package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;

/**
 * Nulls are serialized literally by default (no global Jackson
 * default-property-inclusion configured), which would make the OpenAPI
 * "optional" contract — and the generated frontend types (city?: string,
 * no key present when absent) — unsound: a present "city": null would not
 * match "absent key". Verifies the actual configured ObjectMapper omits
 * null fields entirely, matching that contract.
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
