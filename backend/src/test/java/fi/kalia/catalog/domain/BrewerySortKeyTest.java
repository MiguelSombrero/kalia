package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BrewerySortKeyTest {

	@Test
	void foldsCaseTheWayStringCaseInsensitiveOrderDoes() {
		assertThat(BrewerySortKey.of("Brasserie d'Orval")).isEqualTo("brasserie d'orval");
		assertThat(BrewerySortKey.of("PÕHJALA")).isEqualTo("põhjala");
		assertThat(BrewerySortKey.of("Åbro Bryggeri")).isEqualTo("åbro bryggeri");
	}

	@Test
	void keepsPunctuationAndSpacesSoTheyOrderByCodePoint() {
		assertThat(BrewerySortKey.of("A. Le Coq")).isEqualTo("a. le coq");
		assertThat(BrewerySortKey.of("_x")).isEqualTo("_x");
	}

	@Test
	void foldsOneCharacterAtATimeSoALetterWithNoOneToOneCaseMappingStays() {
		assertThat(BrewerySortKey.of("Straße")).isEqualTo("straße");
	}

	@Test
	void leavesSupplementaryCharactersAloneAsTheComparatorDoes() {
		assertThat(BrewerySortKey.of("𐐀x")).isEqualTo("𐐀x");
	}

	@Test
	void keysCompareLikeTheNamesTheyComeFrom() {
		assertThat(BrewerySortKey.of("d'Orval")).isLessThan(BrewerySortKey.of("de Rochefort"));
		assertThat(BrewerySortKey.of("Pohjola")).isLessThan(BrewerySortKey.of("Põhjala"));
		assertThat(BrewerySortKey.of("BREWDOG")).isEqualTo(BrewerySortKey.of("BrewDog"));
	}

}
