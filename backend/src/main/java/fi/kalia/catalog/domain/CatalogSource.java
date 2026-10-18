package fi.kalia.catalog.domain;

/** Where a catalog row came from (ADR-0077). */
public enum CatalogSource {

	/** The hand-written seed, V004. */
	SEED,

	/** Imported once from the Wikidata snapshot; such a row also carries its QID. */
	WIKIDATA,

	/** Added by a user. */
	USER

}
