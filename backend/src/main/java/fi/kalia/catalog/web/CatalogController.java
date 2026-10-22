package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BeerSearchQuery;
import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.application.ContributionService;
import fi.kalia.catalog.application.InvalidSearchParameterException;
import fi.kalia.catalog.domain.Country;
import fi.kalia.identity.IdentityApi;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
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
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

// No @Validated here: Spring 6.1+ MVC validates constrained parameters natively,
// yielding 400 problem+json instead of the AOP path's unhandled exception.
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Catalog", description = "Search, browse and add to the beer catalog")
class CatalogController {

	private static final Set<String> SORTABLE = Set.of("name", "style", "abv");

	/** ABV is a percentage; a bound above 100 is meaningless. */
	private static final String MAX_ABV = "100";

	/** Bounds search terms without truncating real input. */
	private static final int MAX_FILTER_LENGTH = 100;

	/** A single page pulls at most this many rows, so no one response can return an unbounded slice of a table. */
	private static final long MAX_PAGE_SIZE = 100;

	/** Past this page index a request cannot land on real data at any allowed size — a larger value is malformed, not an empty page. */
	private static final long MAX_PAGE = 10_000;

	/** Batch lookup id cap: keeps the repeated-parameter URL inside ordinary length limits (ADR-0042). */
	private static final int MAX_BATCH_IDS = 100;

	private final CatalogService catalog;

	private final ContributionService contributions;

	private final IdentityApi identity;

	@GetMapping("/beers")
	@Operation(summary = "Search beers", description = "Filter, sort and paginate the beer catalog. All filters are optional and combine with AND semantics.")
	PageDto<BeerSummaryDto> searchBeers(
			@Parameter(description = "Case-insensitive substring match on beer name, at most " + MAX_FILTER_LENGTH + " characters")
			@RequestParam(required = false) @Size(max = MAX_FILTER_LENGTH) String query,
			@Parameter(description = "Exact, case-insensitive style match (e.g. \"IPA\"), at most " + MAX_FILTER_LENGTH + " characters")
			@RequestParam(required = false) @Size(max = MAX_FILTER_LENGTH) String style,
			@Parameter(description = "Restrict to one brewery")
			@RequestParam(required = false) UUID breweryId,
			@Parameter(description = "The brewery's country, one of the ISO 3166-1 alpha-2 codes listed by GET /api/v1/countries")
			@RequestParam(required = false) @Pattern(regexp = Country.CODE_FORMAT) String countryCode,
			@Parameter(description = "Inclusive lower ABV bound, percent (0-" + MAX_ABV + ")")
			@RequestParam(required = false) @DecimalMin("0") @DecimalMax(MAX_ABV) BigDecimal minAbv,
			@Parameter(description = "Inclusive upper ABV bound, percent (0-" + MAX_ABV + ")")
			@RequestParam(required = false) @DecimalMin("0") @DecimalMax(MAX_ABV) BigDecimal maxAbv,
			@Parameter(description = "Zero-based page index, 0-" + MAX_PAGE)
			@RequestParam(defaultValue = "0") @Min(0) @Max(MAX_PAGE) int page,
			@Parameter(description = "Page size, 1-" + MAX_PAGE_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size,
			@Parameter(description = "\"<property>,<asc|desc>\"; property is one of name, style, abv")
			@RequestParam(defaultValue = "name,asc") String sort) {
		requireOrderedAbvRange(minAbv, maxAbv);
		Pageable pageable = PageRequest.of(page, size, parseSort(sort));
		BeerSearchQuery searchQuery = new BeerSearchQuery(query, style, breweryId, countryCode, minAbv, maxAbv);
		return PageDto.from(catalog.searchBeers(searchQuery, pageable).map(BeerSummaryDto::from));
	}

	@GetMapping("/beers/{id}")
	@Operation(summary = "Get beer details", description = "Full details for a single beer, including its brewery.")
	BeerDetailsDto getBeer(@Parameter(description = "Beer id") @PathVariable UUID id) {
		return BeerDetailsDto.from(catalog.getBeer(id));
	}

	@GetMapping("/beers/batch")
	@Operation(summary = "Get beers by id", description = """
			Summaries for a set of beers named by repeated `ids` query parameter, for a client \
			enriching a list it already holds (e.g. a cellar). An id matching no beer is omitted \
			from the response rather than returned as null; order is not significant.""")
	List<BeerSummaryDto> getBeersByIds(
			@Parameter(description = "Beer ids, repeated; 1-" + MAX_BATCH_IDS)
			@RequestParam @Size(min = 1, max = MAX_BATCH_IDS) List<UUID> ids) {
		return catalog.getBeers(ids).stream().map(BeerSummaryDto::from).toList();
	}

	@PostMapping("/beers")
	@ResponseStatus(HttpStatus.CREATED)
	@SecurityRequirement(name = "oauth2")
	@Operation(summary = "Add a beer", description = """
			Adds a beer the catalog lacks, visible to everyone at once. Its brewery is either one \
			the catalog has (breweryId) or one added with it (newBrewery). Two beers are the same \
			when they share a brewery and a name with case, whitespace and punctuation ignored; \
			two breweries when they share such a name and a country.\
			""")
	@ApiResponses({
			@ApiResponse(responseCode = "400", description = """
					A field is missing, out of range, not one of the listed styles or countries, or \
					both or neither of breweryId and newBrewery are given; `errors` lists each one\
					""", content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = ProblemDetail.class))),
			// Do not drop `content = @Content()` (backend/README.md traps).
			@ApiResponse(responseCode = "401", description = "Missing or invalid bearer token", content = @Content()),
			@ApiResponse(responseCode = "404", description = "No brewery with the given breweryId",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = ProblemDetail.class))),
			@ApiResponse(responseCode = "409", description = """
					The catalog already has this beer, named by the problem's `existingBeerId`, or \
					already has the new brewery, named by `existingBreweryId`\
					""", content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = ProblemDetail.class)))})
	BeerDetailsDto addBeer(@Valid @RequestBody AddBeerRequestDto request) {
		return BeerDetailsDto.from(contributions.addBeer(identity.requireCurrentUserId(),
				request.breweryChoice(), request.name(), request.style(), request.abv()));
	}

	@GetMapping("/breweries")
	@Operation(summary = "List breweries", description = "Paginate the brewery list, sorted by name.")
	PageDto<BreweryDto> listBreweries(
			@Parameter(description = "Case-insensitive substring match on brewery name, at most " + MAX_FILTER_LENGTH + " characters")
			@RequestParam(required = false) @Size(max = MAX_FILTER_LENGTH) String query,
			@Parameter(description = "Zero-based page index, 0-" + MAX_PAGE)
			@RequestParam(defaultValue = "0") @Min(0) @Max(MAX_PAGE) int page,
			@Parameter(description = "Page size, 1-" + MAX_PAGE_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
		return PageDto.from(catalog.listBreweries(query, PageRequest.of(page, size)).map(BreweryDto::from));
	}

	@GetMapping("/styles")
	@Operation(summary = "List styles", description = "Every style a beer in the catalog has, sorted by name.")
	List<String> listStyles() {
		return catalog.listStyles();
	}

	@GetMapping("/breweries/countries")
	@Operation(summary = "List the countries breweries are in", description = """
			The ISO 3166-1 alpha-2 code of every country the catalog has a brewery in. Order is \
			not significant: a client sorts by the name it shows.""")
	List<String> listBreweryCountries() {
		return catalog.listBreweryCountries();
	}

	@GetMapping("/countries")
	@Operation(summary = "List countries", description = """
			The ISO 3166-1 alpha-2 code of every country a brewery can be in. Order is not \
			significant: a client sorts by the name it shows.""")
	List<String> listCountries() {
		return catalog.listCountries();
	}

	// See backend/README.md's "Every request parameter is bounded" convention.
	private static void requireOrderedAbvRange(@Nullable BigDecimal minAbv, @Nullable BigDecimal maxAbv) {
		if (minAbv != null && maxAbv != null && minAbv.compareTo(maxAbv) > 0) {
			throw new InvalidSearchParameterException(
					"minAbv (%s) must not be greater than maxAbv (%s)".formatted(minAbv, maxAbv));
		}
	}

	static Sort parseSort(String sort) {
		String[] parts = sort.split(",");
		if (parts.length > 2) {
			throw new InvalidSearchParameterException(
					"Malformed sort '%s'; expected \"<property>,<asc|desc>\"".formatted(sort));
		}
		String property = parts[0].trim();
		if (!SORTABLE.contains(property)) {
			throw new InvalidSearchParameterException(
					"Unsupported sort property '%s'; use one of %s".formatted(property, SORTABLE));
		}
		Sort.Direction direction = Sort.Direction.ASC;
		if (parts.length > 1) {
			String rawDirection = parts[1].trim();
			direction = Sort.Direction.fromOptionalString(rawDirection)
					.orElseThrow(() -> new InvalidSearchParameterException(
							"Unsupported sort direction '%s'; use 'asc' or 'desc'".formatted(rawDirection)));
		}
		Sort.Order order = new Sort.Order(direction, property);
		if (property.equals("name") || property.equals("style")) {
			order = order.ignoreCase();
		}
		// Secondary sort keeps pagination stable when the primary property ties.
		return Sort.by(order, Sort.Order.asc("id"));
	}

}
