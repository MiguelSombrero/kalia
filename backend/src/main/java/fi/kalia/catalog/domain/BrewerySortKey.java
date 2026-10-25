package fi.kalia.catalog.domain;

public final class BrewerySortKey {

	private BrewerySortKey() {
	}

	public static String of(String name) {
		char[] folded = name.toCharArray();
		for (int i = 0; i < folded.length; i++) {
			folded[i] = Character.toLowerCase(Character.toUpperCase(folded[i]));
		}
		return new String(folded);
	}

}
