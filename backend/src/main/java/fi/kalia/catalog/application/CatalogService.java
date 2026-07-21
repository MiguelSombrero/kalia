package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BeerSearchCriteria;
import fi.kalia.catalog.domain.BeerSpecifications;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
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
public class CatalogService {

	private final BeerRepository beers;

	private final BreweryRepository breweries;

	public Page<Beer> searchBeers(BeerSearchCriteria criteria, Pageable pageable) {
		return beers.findAll(BeerSpecifications.matching(criteria), pageable);
	}

	public Beer getBeer(UUID id) {
		return beers.findById(id).orElseThrow(() -> new BeerNotFoundException(id));
	}

	public List<Brewery> listBreweries() {
		// Sorted in Java: DB collations disagree on punctuation (e.g. "d'Orval"),
		// this keeps the API ordering deterministic across environments.
		return breweries.findAll().stream()
				.sorted(Comparator.comparing(Brewery::getName, String.CASE_INSENSITIVE_ORDER))
				.toList();
	}

}
