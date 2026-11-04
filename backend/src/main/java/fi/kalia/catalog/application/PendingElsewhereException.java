package fi.kalia.catalog.application;

public class PendingElsewhereException extends RuntimeException {

	PendingElsewhereException() {
		super("Someone has already suggested this beer; it is waiting for review");
	}

}
