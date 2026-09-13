package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class BeerSpecificationsTest {

	@Test
	void percentIsEscapedAsALiteral() {
		assertThat(BeerSpecifications.escapeLikeWildcards("10%")).isEqualTo("10\\%");
	}

	@Test
	void underscoreIsEscapedAsALiteral() {
		assertThat(BeerSpecifications.escapeLikeWildcards("a_b")).isEqualTo("a\\_b");
	}

	@Test
	void aLoneBackslashIsDoubled() {
		assertThat(BeerSpecifications.escapeLikeWildcards("\\")).isEqualTo("\\\\");
	}

	// Escaping backslashes first keeps the escape character introduced for a
	// wildcard from being escaped a second time in a later pass.
	@Test
	void backslashesAreEscapedBeforeWildcardsSoAWildcardsOwnEscapeIsNotDoubled() {
		String oneBackslash = "\\";
		String input = oneBackslash + "%";
		String expected = oneBackslash + oneBackslash + oneBackslash + "%";

		assertThat(BeerSpecifications.escapeLikeWildcards(input)).isEqualTo(expected);
	}

}
