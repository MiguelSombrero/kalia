package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BeerSearchCriteria;
import fi.kalia.catalog.domain.BeerSpecifications;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

	private final BeerRepository beers;

	private final BreweryRepository breweries;

	public Page<Beer> searchBeers(BeerSearchQuery query, Pageable pageable) {
		return beers.findAll(BeerSpecifications.matching(toCriteria(query)), pageable);
	}

	public boolean beerExists(UUID beerId) {
		return beers.existsById(beerId);
	}

	public Beer getBeer(UUID id) {
		return beers.findById(id).orElseThrow(() -> new BeerNotFoundException(id));
	}

	public List<Beer> getBeers(Collection<UUID> ids) {
		return beers.findByIdIn(ids);
	}

	public Page<Brewery> listBreweries(Pageable pageable) {
		// Sorted in Java: DB collations disagree on punctuation (e.g. "d'Orval"),
		// this keeps the API ordering deterministic across environments.
		List<Brewery> sorted = breweries.findAll().stream()
				.sorted(Comparator.comparing(Brewery::getName, String.CASE_INSENSITIVE_ORDER))
				.toList();
		int from = (int) Math.min(pageable.getOffset(), sorted.size());
		int to = Math.min(from + pageable.getPageSize(), sorted.size());
		return new PageImpl<>(sorted.subList(from, to), pageable, sorted.size());
	}

	private static BeerSearchCriteria toCriteria(BeerSearchQuery query) {
		return new BeerSearchCriteria(query.query(), query.style(), query.breweryId(),
				query.country(), query.minAbv(), query.maxAbv());
	}

}
