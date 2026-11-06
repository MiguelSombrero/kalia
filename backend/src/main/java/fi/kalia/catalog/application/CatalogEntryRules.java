package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.Country;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** The catalog-dependent rules every path that adds a beer or brewery answers to, once (ADR-0091). */
@Component
@RequiredArgsConstructor
class CatalogEntryRules {

	private final BeerRepository beers;

	String knownStyle(String style) {
		return beers.findStylesIgnoringCase(style.strip()).stream().findFirst()
				.orElseThrow(UnknownStyleException::new);
	}

	void requireListedCountry(String countryCode) {
		if (!Country.isListed(countryCode)) {
			throw new UnknownCountryException();
		}
	}

}
