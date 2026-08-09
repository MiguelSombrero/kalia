package fi.kalia.cellar.application;

public class InvalidBottleException extends RuntimeException {

	public InvalidBottleException(String message, Throwable cause) {
		super(message, cause);
	}

}
