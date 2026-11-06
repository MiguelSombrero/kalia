package fi.kalia.catalog.application;

import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.ContributorStatusCount;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import fi.kalia.catalog.domain.ModerationStatus;
import fi.kalia.catalog.domain.Review;
import fi.kalia.catalog.domain.ReviewOutcome;
import fi.kalia.catalog.domain.ReviewRepository;
import fi.kalia.profile.ProfileApi;
import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SuggestionReviewService {

	private final BeerRepository beers;

	private final BreweryRepository breweries;

	private final ReviewRepository reviews;

	private final ProfileApi profiles;

	private final Clock clock;

	public Page<Suggestion> pendingSuggestions(Pageable pageable) {
		Page<Beer> page = beers.findSuggestions(pageable);
		return new PageImpl<>(suggestionsOf(page.getContent()), pageable, page.getTotalElements());
	}

	public Suggestion pendingSuggestion(UUID id) {
		Beer beer = beers.findSuggestionById(id).orElseThrow(() -> new SuggestionNotFoundException(id));
		return suggestionsOf(List.of(beer)).getFirst();
	}

	@Transactional
	public SuggestionDecision approve(UUID id, UUID adminId) {
		Beer beer = lockSuggestion(id);
		Brewery brewery = lockBreweryOf(beer);
		Instant decidedAt = beer.approve(clock);
		brewery.approveIfPending();
		beers.saveAndFlush(beer);
		reviews.save(Review.approval(id, adminId, decidedAt));
		return new SuggestionDecision(beer, brewery, ReviewOutcome.APPROVED, null, decidedAt);
	}

	@Transactional
	public SuggestionDecision reject(UUID id, UUID adminId, RejectionReason reason) {
		Beer beer = lockSuggestion(id);
		Brewery brewery = lockBreweryOf(beer);
		Instant decidedAt = beer.reject(reason, clock);
		if (!beers.existsOtherPendingAt(brewery.getId(), id)) {
			brewery.rejectIfPending();
		}
		beers.saveAndFlush(beer);
		reviews.save(Review.rejection(id, adminId, reason, decidedAt));
		return new SuggestionDecision(beer, brewery, ReviewOutcome.REJECTED, reason, decidedAt);
	}

	// A beer nobody contributed is no suggestion: 404, not 409.
	private Beer lockSuggestion(UUID id) {
		Beer beer = beers.findByIdForUpdate(id).filter(found -> found.getContributorId() != null)
				.orElseThrow(() -> new SuggestionNotFoundException(id));
		if (!beer.isSuggestion()) {
			ReviewOutcome outcome = ReviewOutcome.decidedAs(beer.getModerationStatus()).orElseThrow();
			Instant decidedAt = reviews.findFirstByBeerIdOrderByDecidedAtDescIdDesc(id).map(Review::getDecidedAt)
					.orElse(null);
			throw new SuggestionAlreadyDecidedException(outcome, decidedAt);
		}
		return beer;
	}

	// Taken after the beer's and before any sibling is counted: two siblings rejected at once would
	// otherwise each see the other as pending and leave the brewery pending for good (ADR-0102).
	private Brewery lockBreweryOf(Beer beer) {
		return breweries.findAllByIdForUpdate(List.of(beer.getBrewery().getId())).getFirst();
	}

	private List<Suggestion> suggestionsOf(List<Beer> pending) {
		Set<UUID> contributors = pending.stream().map(Beer::getContributorId).collect(Collectors.toSet());
		Map<UUID, String> usernames = profiles.usernames(contributors);
		Map<UUID, Long> pendingCounts = new HashMap<>();
		Map<UUID, Long> rejectedCounts = new HashMap<>();
		for (ContributorStatusCount count : beers.countPendingAndRejectedByContributor(contributors)) {
			(count.status() == ModerationStatus.PENDING ? pendingCounts : rejectedCounts)
					.put(count.contributorId(), count.count());
		}
		return pending.stream()
				.map(beer -> new Suggestion(beer, usernames.get(beer.getContributorId()),
						pendingCounts.getOrDefault(beer.getContributorId(), 0L),
						rejectedCounts.getOrDefault(beer.getContributorId(), 0L)))
				.toList();
	}

}
