package fi.kalia.cellar.application;

import java.util.UUID;

public class BeerNotFoundException extends RuntimeException {

	public BeerNotFoundException(UUID beerId) {
		super("No beer with id " + beerId);
	}

}
