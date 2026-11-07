package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import fi.kalia.catalog.domain.ModerationStatus;
import java.math.BigDecimal;
import java.time.Clock;
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

	private final CatalogEntryRules rules;

	private final Clock clock;

	/** Most suggestions one contributor may have waiting for review at once (ADR-0102). */
	public static final int MAX_PENDING_ENTRIES = 20;

	// ADR-0057; the retry finding the winner's row is verified by ConcurrentAddBeerApiIT.
	@Retryable(includes = DataIntegrityViolationException.class, maxRetries = 1, delay = 0)
	public Beer addBeer(UUID contributorId, BreweryChoice breweryChoice, String name, String style,
			BigDecimal abv) {
		String knownStyle = rules.knownStyle(style);
		// Two adds by one contributor queue here, so the count below cannot be read by both.
		beers.lockContributorAdds(contributorId.getMostSignificantBits() ^ contributorId.getLeastSignificantBits());
		Brewery brewery;
		switch (breweryChoice) {
			case BreweryChoice.Existing existing -> {
				brewery = existingBrewery(contributorId, existing.breweryId(), name);
				requireRoomForPending(contributorId);
			}
			case BreweryChoice.New added -> {
				Brewery newBrewery = newBrewery(contributorId, added);
				requireRoomForPending(contributorId);
				brewery = breweries.saveAndFlush(newBrewery);
			}
		}
		return beers.saveAndFlush(Beer.addedBy(contributorId, brewery, name, knownStyle, abv, clock));
	}

	private Brewery existingBrewery(UUID contributorId, UUID breweryId, String beerName) {
		Brewery brewery = breweries.findVisibleById(breweryId, contributorId)
				.orElseThrow(() -> new BreweryNotFoundException(breweryId));
		beers.findIdByBreweryIdAndSameName(breweryId, beerName).ifPresent(existingId -> {
			if (!beers.isVisibleTo(existingId, contributorId)) {
				throw PendingElsewhereException.beer();
			}
			throw new DuplicateBeerException(existingId);
		});
		return brewery;
	}

	private Brewery newBrewery(UUID contributorId, BreweryChoice.New added) {
		rules.requireListedCountry(added.countryCode());
		breweries.findBySameNameAndCountryCode(added.name(), added.countryCode()).ifPresent(existing -> {
			if (breweries.findVisibleById(existing.getId(), contributorId).isEmpty()) {
				throw PendingElsewhereException.brewery();
			}
			throw new DuplicateBreweryException(existing.getId(), existing.getName(), existing.getCountryCode());
		});
		return Brewery.addedBy(contributorId, added.name(), added.countryCode(), added.city(), clock);
	}

	private void requireRoomForPending(UUID contributorId) {
		long waiting = beers.countByContributorIdAndModerationStatus(contributorId, ModerationStatus.PENDING);
		if (waiting >= MAX_PENDING_ENTRIES) {
			throw new TooManyPendingEntriesException(MAX_PENDING_ENTRIES);
		}
	}

}
