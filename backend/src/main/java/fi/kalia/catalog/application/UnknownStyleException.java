package fi.kalia.catalog.application;

public class UnknownStyleException extends RuntimeException {

	UnknownStyleException() {
		super("is not one of the catalog's styles");
	}

}
