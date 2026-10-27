package fi.kalia.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SimilarNameWordsTest {

	@Test
	void splitsOnEverythingThatIsNotALetterOrADigitAndFoldsCase() {
		assertThat(SimilarNameWords.of("Ruosniemen-Panimo  IPA 2.0")).containsExactly("ruosniemen", "panimo", "ipa");
	}

	@Test
	void keepsLettersOutsideAscii() {
		assertThat(SimilarNameWords.of("Öö Bourbon")).containsExactly("öö", "bourbon");
	}

	@Test
	void dropsWordsTooShortToSayAnythingAndRepeatedOnes() {
		assertThat(SimilarNameWords.of("a & b IPA ipa")).containsExactly("ipa");
	}

	@Test
	void textWithoutAWordYieldsNoWords() {
		assertThat(SimilarNameWords.of("- . &")).isEmpty();
	}

	@Test
	void countsOnlyTheFirstWordsOfALongName() {
		assertThat(SimilarNameWords.of("aa bb cc dd ee ff gg hh ii jj"))
				.hasSize(SimilarNameWords.MAX_WORDS)
				.endsWith("hh");
	}

}
