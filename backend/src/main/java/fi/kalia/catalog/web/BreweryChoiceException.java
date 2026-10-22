package fi.kalia.catalog.web;

class BreweryChoiceException extends RuntimeException {

	BreweryChoiceException() {
		super("give exactly one of breweryId and newBrewery");
	}

}
