package fi.kalia.catalog.application;

import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.ContributorStatusCount;
import fi.kalia.catalog.domain.ModerationStatus;
import fi.kalia.profile.ProfileApi;
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

	private final ProfileApi profiles;

	public Page<Suggestion> pendingSuggestions(Pageable pageable) {
		Page<Beer> page = beers.findSuggestions(pageable);
		return new PageImpl<>(suggestionsOf(page.getContent()), pageable, page.getTotalElements());
	}

	public Suggestion pendingSuggestion(UUID id) {
		Beer beer = beers.findSuggestionById(id).orElseThrow(() -> new SuggestionNotFoundException(id));
		return suggestionsOf(List.of(beer)).getFirst();
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
