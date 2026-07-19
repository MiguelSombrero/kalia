package fi.kalia.catalog.internal;

import fi.kalia.catalog.BeerDetailsDto;
import fi.kalia.catalog.BeerSearchCriteria;
import fi.kalia.catalog.BeerSummaryDto;
import fi.kalia.catalog.BreweryDto;
import fi.kalia.catalog.BreweryRefDto;
import fi.kalia.catalog.MoneyDto;
import fi.kalia.catalog.PageDto;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
class CatalogService {

	private final BeerRepository beers;

	private final BreweryRepository breweries;

	PageDto<BeerSummaryDto> searchBeers(BeerSearchCriteria criteria, Pageable pageable) {
		Page<Beer> page = beers.findAll(BeerSpecifications.matching(criteria), pageable);
		return new PageDto<>(
				page.getContent().stream().map(CatalogService::toSummary).toList(),
				page.getTotalElements(), page.getTotalPages(), page.getNumber());
	}

	BeerDetailsDto getBeer(UUID id) {
		return beers.findById(id).map(CatalogService::toDetails)
				.orElseThrow(() -> new BeerNotFoundException(id));
	}

	List<BreweryDto> listBreweries() {
		// Sorted in Java: DB collations disagree on punctuation (e.g. "d'Orval"),
		// this keeps the API ordering deterministic across environments.
		return breweries.findAll().stream()
				.sorted(Comparator.comparing(Brewery::getName, String.CASE_INSENSITIVE_ORDER))
				.map(b -> new BreweryDto(b.getId(), b.getName(), b.getCountry(), b.getCity()))
				.toList();
	}

	private static BeerSummaryDto toSummary(Beer beer) {
		return new BeerSummaryDto(beer.getId(), beer.getName(), beer.getStyle(), beer.getAbv(),
				new MoneyDto(beer.getPrice().cents(), beer.getPrice().currency()),
				new BreweryRefDto(beer.getBrewery().getId(), beer.getBrewery().getName()));
	}

	private static BeerDetailsDto toDetails(Beer beer) {
		Brewery brewery = beer.getBrewery();
		return new BeerDetailsDto(beer.getId(), beer.getName(), beer.getStyle(), beer.getAbv(),
				beer.getDescription(),
				new MoneyDto(beer.getPrice().cents(), beer.getPrice().currency()),
				new BreweryDto(brewery.getId(), brewery.getName(), brewery.getCountry(), brewery.getCity()));
	}

}
