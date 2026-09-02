package fi.kalia.cellar.domain;

public class InvalidBottleException extends RuntimeException {

	public InvalidBottleException(String message) {
		super(message);
	}

}
