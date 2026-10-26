package fi.kalia.catalog.web;

import fi.kalia.catalog.application.BeerSearchQuery;
import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.application.ContributionService;
import fi.kalia.catalog.application.InvalidSearchParameterException;
import fi.kalia.catalog.domain.Country;
import fi.kalia.identity.IdentityApi;
import fi.kalia.web.Problem;
import fi.kalia.web.ValidationProblem;
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

	/** Rows a page may skip (page × size): keeps one request's cost fixed however large the catalog grows, since past it a visitor narrows the search instead. */
	private static final long MAX_OFFSET = 10_000;

	private static final String OFFSET_BOUND = "A page skipping more than " + MAX_OFFSET + " rows (page × size) is refused with 400 problem+json.";

	private static final String PAGE_DESCRIPTION = "Zero-based page index; page × size is at most " + MAX_OFFSET;

	private final CatalogService catalog;

	private final ContributionService contributions;

	private final IdentityApi identity;

	@GetMapping("/beers")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@ApiResponse(responseCode = "400", description = "A filter is malformed or out of range, minAbv is above maxAbv, the sort is unsupported, or the page skips more rows than allowed",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(oneOf = {ValidationProblem.class, Problem.class})))
	@Operation(summary = "Search beers", description = "Filter, sort and paginate the beer catalog. All filters are optional and combine with AND semantics. " + OFFSET_BOUND)
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
			@Parameter(description = PAGE_DESCRIPTION)
			@RequestParam(defaultValue = "0") @Min(0) @Max(MAX_OFFSET) int page,
			@Parameter(description = "Page size, 1-" + MAX_PAGE_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size,
			@Parameter(description = "\"<property>,<asc|desc>\"; property is one of name, style, abv")
			@RequestParam(defaultValue = "name,asc") String sort) {
		requireOrderedAbvRange(minAbv, maxAbv);
		requireBoundedOffset(page, size);
		Pageable pageable = PageRequest.of(page, size, parseSort(sort));
		BeerSearchQuery searchQuery = new BeerSearchQuery(query, style, breweryId, countryCode, minAbv, maxAbv);
		return PageDto.from(catalog.searchBeers(searchQuery, pageable).map(BeerSummaryDto::from));
	}

	@GetMapping("/beers/{id}")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@ApiResponse(responseCode = "400", description = "The id is not a UUID",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(implementation = Problem.class)))
	@ApiResponse(responseCode = "404", description = "No beer with this id",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(implementation = Problem.class)))
	@Operation(summary = "Get beer details", description = "Full details for a single beer, including its brewery.")
	BeerDetailsDto getBeer(@Parameter(description = "Beer id") @PathVariable UUID id) {
		return BeerDetailsDto.from(catalog.getBeer(id));
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
							schema = @Schema(oneOf = {ValidationProblem.class, Problem.class}))),
			@ApiResponse(responseCode = "401", description = "Missing or invalid bearer token",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "404", description = "No brewery with the given breweryId",
					content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(implementation = Problem.class))),
			@ApiResponse(responseCode = "409", description = """
					The catalog already has this beer, named by `existingBeerId`, or already has the \
					new brewery, named by `existingBreweryId` and spelled as the catalog spells it\
					""", content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
							schema = @Schema(oneOf = {DuplicateBeerProblem.class, DuplicateBreweryProblem.class})))})
	BeerDetailsDto addBeer(@Valid @RequestBody AddBeerRequestDto request) {
		return BeerDetailsDto.from(contributions.addBeer(identity.requireCurrentUserId(),
				request.breweryChoice(), request.name(), request.style(), request.abv()));
	}

	@GetMapping("/breweries")
	// Do not remove: matches Spring's default, but its absence would silently
	// drop this operation's 200 from /v3/api-docs (backend/README.md traps).
	@ResponseStatus(HttpStatus.OK)
	@ApiResponse(responseCode = "400", description = "The query is too long, a page parameter is out of range, or the page skips more rows than allowed",
			content = @Content(mediaType = MediaType.APPLICATION_PROBLEM_JSON_VALUE,
					schema = @Schema(oneOf = {ValidationProblem.class, Problem.class})))
	@Operation(summary = "List breweries", description = "Paginate the brewery list, sorted by name. " + OFFSET_BOUND)
	PageDto<BreweryDto> listBreweries(
			@Parameter(description = "Case-insensitive substring match on brewery name, at most " + MAX_FILTER_LENGTH + " characters")
			@RequestParam(required = false) @Size(max = MAX_FILTER_LENGTH) String query,
			@Parameter(description = PAGE_DESCRIPTION)
			@RequestParam(defaultValue = "0") @Min(0) @Max(MAX_OFFSET) int page,
			@Parameter(description = "Page size, 1-" + MAX_PAGE_SIZE)
			@RequestParam(defaultValue = "20") @Min(1) @Max(MAX_PAGE_SIZE) int size) {
		requireBoundedOffset(page, size);
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

	private static void requireBoundedOffset(int page, int size) {
		if ((long) page * size > MAX_OFFSET) {
			throw new InvalidSearchParameterException(
					"page (%d) × size (%d) must not skip more than %d rows; narrow the search instead"
							.formatted(page, size, MAX_OFFSET));
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
