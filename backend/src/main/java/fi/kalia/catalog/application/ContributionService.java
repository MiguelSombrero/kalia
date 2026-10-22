package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import fi.kalia.catalog.domain.Country;
import java.math.BigDecimal;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ContributionService {

	private final BeerRepository beers;

	private final BreweryRepository breweries;

	// ADR-0057; the retry finding the winner's row is verified by ConcurrentAddBeerApiIT.
	@Retryable(includes = DataIntegrityViolationException.class, maxRetries = 1, delay = 0)
	public Beer addBeer(UUID contributorId, BreweryChoice breweryChoice, String name, String style,
			BigDecimal abv) {
		String knownStyle = knownStyle(style);
		Brewery brewery = switch (breweryChoice) {
			case BreweryChoice.Existing existing -> existingBrewery(existing.breweryId(), name);
			case BreweryChoice.New added -> addBrewery(contributorId, added);
		};
		return beers.saveAndFlush(Beer.addedBy(contributorId, brewery, name, knownStyle, abv));
	}

	private Brewery existingBrewery(UUID breweryId, String beerName) {
		Brewery brewery = breweries.findById(breweryId).orElseThrow(() -> new BreweryNotFoundException(breweryId));
		beers.findIdByBreweryIdAndSameName(breweryId, beerName).ifPresent(existingId -> {
			throw new DuplicateBeerException(existingId);
		});
		return brewery;
	}

	private Brewery addBrewery(UUID contributorId, BreweryChoice.New added) {
		Country country = Country.named(added.country()).orElseThrow(UnknownCountryException::new);
		breweries.findIdBySameNameAndCountry(added.name(), country.name()).ifPresent(existingId -> {
			throw new DuplicateBreweryException(existingId);
		});
		return breweries.saveAndFlush(Brewery.addedBy(contributorId, added.name(), country.name(), added.city()));
	}

	private String knownStyle(String style) {
		return beers.findStylesIgnoringCase(style.strip()).stream().findFirst()
				.orElseThrow(UnknownStyleException::new);
	}

}
