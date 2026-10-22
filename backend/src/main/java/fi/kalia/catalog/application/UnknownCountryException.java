package fi.kalia.catalog.application;

public class UnknownCountryException extends RuntimeException {

	UnknownCountryException() {
		super("is not one of the listed countries");
	}

}
