package fi.kalia.catalog.application;

import java.text.Normalizer;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

public final class SimilarNameWords {

	/** A one-letter word ("a", "&") matches too many names to say anything about similarity. */
	public static final int MIN_WORD_LENGTH = 2;

	/** One brewery's search ORs one LIKE per word; a name longer than this is a sentence, and its first words say as much. */
	public static final int MAX_WORDS = 8;

	private SimilarNameWords() {
	}

	static List<String> of(String name) {
		String folded = Normalizer.normalize(name, Normalizer.Form.NFKC).toLowerCase(Locale.ROOT);
		return Arrays.stream(folded.split("[^\\p{L}\\p{N}]+"))
				.filter(word -> word.length() >= MIN_WORD_LENGTH)
				.distinct()
				.limit(MAX_WORDS)
				.toList();
	}

}
