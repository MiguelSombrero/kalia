package fi.kalia.cellar.application;

import java.util.UUID;

public class EntryNotFoundException extends RuntimeException {

	public EntryNotFoundException(UUID entryId) {
		super("No entry with id " + entryId);
	}

}
