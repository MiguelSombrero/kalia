package fi.kalia.catalog.application;

import fi.kalia.catalog.BeerSummaries;
import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BeerSearchCriteria;
import fi.kalia.catalog.domain.BeerSpecifications;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import fi.kalia.catalog.domain.Country;
import fi.kalia.catalog.domain.ModerationStatus;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CatalogService {

	private static final int TRIGRAM_LENGTH = 3;

	private final BeerRepository beers;

	private final BreweryRepository breweries;

	public Page<Beer> searchBeers(BeerSearchQuery query, @Nullable UUID viewerId, Pageable pageable) {
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
		return beers.findAll(BeerSpecifications.visibleTo(viewerId)
				.and(BeerSpecifications.matching(toCriteria(query, nameWords))), pageable);
	}

	public boolean beerVisibleTo(UUID beerId, @Nullable UUID viewerId) {
		return beers.exists(visibleTo(beerId, viewerId));
	}

	public Beer getBeer(UUID id, @Nullable UUID viewerId) {
		return beers.findOne(visibleTo(id, viewerId)).orElseThrow(() -> new BeerNotFoundException(id));
	}

	// A rejected or removed beer is still summarised: cellar entries and feed lines
	// keep showing what they point at (ADR-0091). Only a pending beer is withheld.
	public BeerSummaries getBeerSummaries(Collection<UUID> ids, @Nullable UUID viewerId) {
		Map<UUID, BeerSummary> found = new HashMap<>();
		Set<UUID> withheld = new HashSet<>();
		for (Beer beer : beers.findByIdIn(ids)) {
			boolean pendingForSomeoneElse = beer.getModerationStatus() == ModerationStatus.PENDING
					&& !Objects.equals(beer.getContributorId(), viewerId);
			if (pendingForSomeoneElse) {
				withheld.add(beer.getId());
			} else {
				found.put(beer.getId(), new BeerSummary(beer.getId(), beer.getName(), beer.getBrewery().getName(),
						beer.getStyle(), beer.getAbv()));
			}
		}
		return new BeerSummaries(found, withheld);
	}

	public Set<UUID> withheldFromPublic(Collection<UUID> ids) {
		return new HashSet<>(beers.findIdsByIdInAndModerationStatusNot(ids, ModerationStatus.APPROVED));
	}

	public Page<Brewery> listBreweries(@Nullable String nameQuery, @Nullable UUID viewerId, Pageable pageable) {
		if (nameQuery == null || nameQuery.isBlank()) {
			return breweries.findPage(viewerId, pageable);
		}
		return breweries.findPageByNameContaining(nameQuery.strip(), viewerId, pageable);
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

	private static Specification<Beer> visibleTo(UUID beerId, @Nullable UUID viewerId) {
		return BeerSpecifications.visibleTo(viewerId)
				.and((root, query, cb) -> cb.equal(root.get("id"), beerId));
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
