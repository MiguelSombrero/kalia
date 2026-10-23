package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CountryTest {

	@Test
	void listsEveryIso3166EntryOnceByItsCode() {
		assertThat(Country.CODES).hasSize(249).doesNotHaveDuplicates()
				.allSatisfy(code -> assertThat(code).matches(Country.CODE_FORMAT));
	}

	@Test
	void aCodeIsListedOnlyAsItIsWritten() {
		assertThat(Country.isListed("FI")).isTrue();
		assertThat(Country.isListed("fi")).isFalse();
		assertThat(Country.isListed("Finland")).isFalse();
		assertThat(Country.isListed("XX")).isFalse();
	}

}
