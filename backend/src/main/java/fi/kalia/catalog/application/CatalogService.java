package fi.kalia.catalog.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BeerSearchCriteria;
import fi.kalia.catalog.domain.BeerSpecifications;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import fi.kalia.catalog.domain.Country;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

	private static final int TRIGRAM_LENGTH = 3;

	private final BeerRepository beers;

	private final BreweryRepository breweries;

	public Page<Beer> searchBeers(BeerSearchQuery query, Pageable pageable) {
		if (query.countryCode() != null && !Country.isListed(query.countryCode())) {
			throw new InvalidSearchParameterException(
					"countryCode '%s' is not one of the listed countries".formatted(query.countryCode()));
		}
		if (query.similarTo() != null && query.breweryId() == null) {
			throw new InvalidSearchParameterException(
					"similarTo only searches within one brewery; give a breweryId as well");
		}
		@Nullable List<String> nameWords = nameWords(query);
		if (hasNoTrigrams(query.query()) || hasNoTrigrams(nameWords)) {
			beers.useCustomPlansForTheRestOfThisTransaction();
		}
		return beers.findAll(BeerSpecifications.matching(toCriteria(query, nameWords)), pageable);
	}

	public boolean beerExists(UUID beerId) {
		return beers.existsById(beerId);
	}

	public Beer getBeer(UUID id) {
		return beers.findById(id).orElseThrow(() -> new BeerNotFoundException(id));
	}

	public List<BeerSummary> getBeerSummaries(Collection<UUID> ids) {
		return beers.findByIdIn(ids).stream()
				.map(beer -> new BeerSummary(beer.getId(), beer.getName(), beer.getBrewery().getName(),
						beer.getStyle(), beer.getAbv()))
				.toList();
	}

	public Page<Brewery> listBreweries(@Nullable String nameQuery, Pageable pageable) {
		if (nameQuery == null || nameQuery.isBlank()) {
			return breweries.findPage(pageable);
		}
		return breweries.findPageByNameContaining(nameQuery.strip(), pageable);
	}

	public List<String> listStyles() {
		return beers.findDistinctStyles().stream().sorted(String.CASE_INSENSITIVE_ORDER).toList();
	}

	public List<String> listCountries() {
		return Country.CODES;
	}

	public List<String> listBreweryCountries() {
		return breweries.findDistinctCountryCodes();
	}

	private static boolean hasNoTrigrams(@Nullable String nameQuery) {
		return nameQuery != null && !nameQuery.isBlank() && nameQuery.length() < TRIGRAM_LENGTH;
	}

	private static boolean hasNoTrigrams(@Nullable List<String> words) {
		return words != null && words.stream().anyMatch(word -> word.length() < TRIGRAM_LENGTH);
	}

	private static @Nullable List<String> nameWords(BeerSearchQuery query) {
		return query.similarTo() == null ? null : SimilarNameWords.of(query.similarTo());
	}

	private static BeerSearchCriteria toCriteria(BeerSearchQuery query, @Nullable List<String> nameWords) {
		return new BeerSearchCriteria(query.query(), query.style(), query.breweryId(),
				query.countryCode(), query.minAbv(), query.maxAbv(), nameWords);
	}

}
