package fi.kalia.catalog.application;

import lombok.Getter;

@Getter
public class PendingElsewhereException extends RuntimeException {

	/** What another contributor holds as {@code PENDING}. */
	public enum Subject {
		BEER, BREWERY
	}

	private final Subject subject;

	private PendingElsewhereException(Subject subject, String message) {
		super(message);
		this.subject = subject;
	}

	static PendingElsewhereException beer() {
		return new PendingElsewhereException(Subject.BEER,
				"Someone has already suggested this beer; it is waiting for review");
	}

	static PendingElsewhereException brewery() {
		return new PendingElsewhereException(Subject.BREWERY,
				"The catalog already has a brewery of this name in this country, whatever its status");
	}

}
