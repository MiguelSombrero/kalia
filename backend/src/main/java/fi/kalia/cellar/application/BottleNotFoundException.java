package fi.kalia.cellar.application;

import java.util.UUID;

public class BottleNotFoundException extends RuntimeException {

	public BottleNotFoundException(UUID bottleId) {
		super("No bottle with id " + bottleId);
	}

}
