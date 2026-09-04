package fi.kalia.cellar.application;

// One response for an unknown username, a private cellar and the owner's own
// private cellar, so none can be told from the others (ADR-0050).
public class PublicCellarNotFoundException extends RuntimeException {

	public PublicCellarNotFoundException() {
		super("No public cellar found");
	}

}
