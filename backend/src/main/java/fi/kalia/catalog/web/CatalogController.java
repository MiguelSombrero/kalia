package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BeerSearchQuery;
import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.application.InvalidSearchParameterException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
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
@Tag(name = "Catalog", description = "Search and browse the beer catalog")
class CatalogController {

	private static final Set<String> SORTABLE = Set.of("name", "style", "abv");

	/** ABV is a percentage; a bound above 100 is meaningless. */
	private static final String MAX_ABV = "100";

	/** Bounds search terms without truncating real input — the longest official country name runs to 56 characters. */
	private static final int MAX_FILTER_LENGTH = 100;

	private final CatalogService catalog;

	@GetMapping("/beers")
	@Operation(summary = "Search beers", description = "Filter, sort and paginate the beer catalog. All filters are optional and combine with AND semantics.")
	PageDto<BeerSummaryDto> searchBeers(
			@Parameter(description = "Case-insensitive substring match on beer name, at most " + MAX_FILTER_LENGTH + " characters")
			@RequestParam(required = false) @Size(max = MAX_FILTER_LENGTH) String query,
			@Parameter(description = "Exact, case-insensitive style match (e.g. \"IPA\"), at most " + MAX_FILTER_LENGTH + " characters")
			@RequestParam(required = false) @Size(max = MAX_FILTER_LENGTH) String style,
			@Parameter(description = "Restrict to one brewery")
			@RequestParam(required = false) UUID breweryId,
			@Parameter(description = "Exact, case-insensitive match on the brewery's country, at most " + MAX_FILTER_LENGTH + " characters")
			@RequestParam(required = false) @Size(max = MAX_FILTER_LENGTH) String country,
			@Parameter(description = "Inclusive lower ABV bound, percent (0-" + MAX_ABV + ")")
			@RequestParam(required = false) @DecimalMin("0") @DecimalMax(MAX_ABV) BigDecimal minAbv,
			@Parameter(description = "Inclusive upper ABV bound, percent (0-" + MAX_ABV + ")")
			@RequestParam(required = false) @DecimalMin("0") @DecimalMax(MAX_ABV) BigDecimal maxAbv,
			@Parameter(description = "Zero-based page index")
			@RequestParam(defaultValue = "0") @Min(0) int page,
			@Parameter(description = "Page size, 1-100")
			@RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
			@Parameter(description = "\"<property>,<asc|desc>\"; property is one of name, style, abv")
			@RequestParam(defaultValue = "name,asc") String sort) {
		requireOrderedAbvRange(minAbv, maxAbv);
		Pageable pageable = PageRequest.of(page, size, parseSort(sort));
		BeerSearchQuery searchQuery = new BeerSearchQuery(query, style, breweryId, country, minAbv, maxAbv);
		return PageDto.from(catalog.searchBeers(searchQuery, pageable).map(BeerSummaryDto::from));
	}

	@GetMapping("/beers/{id}")
	@Operation(summary = "Get beer details", description = "Full details for a single beer, including its brewery.")
	BeerDetailsDto getBeer(@Parameter(description = "Beer id") @PathVariable UUID id) {
		return BeerDetailsDto.from(catalog.getBeer(id));
	}

	@GetMapping("/breweries")
	@Operation(summary = "List breweries", description = "All breweries, sorted by name.")
	List<BreweryDto> listBreweries() {
		return catalog.listBreweries().stream().map(BreweryDto::from).toList();
	}

	// See backend/README.md's "Every request parameter is bounded" convention.
	private static void requireOrderedAbvRange(@Nullable BigDecimal minAbv, @Nullable BigDecimal maxAbv) {
		if (minAbv != null && maxAbv != null && minAbv.compareTo(maxAbv) > 0) {
			throw new InvalidSearchParameterException(
					"minAbv (%s) must not be greater than maxAbv (%s)".formatted(minAbv, maxAbv));
		}
	}

	private static Sort parseSort(String sort) {
		String[] parts = sort.split(",");
		String property = parts[0].trim();
		if (!SORTABLE.contains(property)) {
			throw new InvalidSearchParameterException(
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
