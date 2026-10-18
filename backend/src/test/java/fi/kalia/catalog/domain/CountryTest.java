package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CountryTest {

	@Test
	void listsEveryIso3166EntryOnceByCodeAndByName() {
		assertThat(Country.ALL).hasSize(249);
		assertThat(Country.ALL).extracting(Country::code).doesNotHaveDuplicates()
				.allSatisfy(code -> assertThat(code).matches("[A-Z]{2}"));
		assertThat(Country.ALL).extracting(Country::name).doesNotHaveDuplicates();
	}

	@Test
	void findsACountryByItsNameIgnoringCaseAndSurroundingWhitespace() {
		assertThat(Country.named("  united states ")).contains(new Country("US", "United States"));
		assertThat(Country.named("Atlantis")).isEmpty();
		assertThat(Country.named("US")).isEmpty();
	}

}
