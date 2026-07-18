package fi.kalia.catalog.internal;

import fi.kalia.catalog.BeerDetailsDto;
import fi.kalia.catalog.BeerSearchCriteria;
import fi.kalia.catalog.BeerSummaryDto;
import fi.kalia.catalog.BreweryDto;
import fi.kalia.catalog.PageDto;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

// No @Validated here: Spring 6.1+ MVC validates constrained parameters natively,
// yielding 400 problem+json instead of the AOP path's unhandled exception.
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
class CatalogController {

	private static final Set<String> SORTABLE = Set.of("name", "style", "abv");

	private final CatalogService catalog;

	@GetMapping("/beers")
	PageDto<BeerSummaryDto> searchBeers(
			@RequestParam(required = false) String query,
			@RequestParam(required = false) String style,
			@RequestParam(required = false) UUID breweryId,
			@RequestParam(required = false) String country,
			@RequestParam(required = false) @DecimalMin("0") BigDecimal minAbv,
			@RequestParam(required = false) @DecimalMin("0") BigDecimal maxAbv,
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
			@RequestParam(defaultValue = "name,asc") String sort) {
		Pageable pageable = PageRequest.of(page, size, parseSort(sort));
		return catalog.searchBeers(
				new BeerSearchCriteria(query, style, breweryId, country, minAbv, maxAbv),
				pageable);
	}

	@GetMapping("/beers/{id}")
	BeerDetailsDto getBeer(@PathVariable UUID id) {
		return catalog.getBeer(id);
	}

	@GetMapping("/breweries")
	List<BreweryDto> listBreweries() {
		return catalog.listBreweries();
	}

	private static Sort parseSort(String sort) {
		String[] parts = sort.split(",");
		String property = parts[0].trim();
		if (!SORTABLE.contains(property)) {
			throw new IllegalArgumentException(
					"Unsupported sort property '%s'; use one of %s".formatted(property, SORTABLE));
		}
		Sort.Direction direction = parts.length > 1 && parts[1].trim().equalsIgnoreCase("desc")
				? Sort.Direction.DESC
				: Sort.Direction.ASC;
		Sort.Order order = new Sort.Order(direction, property);
		if (property.equals("name") || property.equals("style")) {
			order = order.ignoreCase();
		}
		// Secondary sort keeps pagination stable when the primary property ties.
		return Sort.by(order, Sort.Order.asc("id"));
	}

}
