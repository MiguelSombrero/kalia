package fi.kalia.feed.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import fi.kalia.profile.ProfileApi;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

	@Mock
	private FeedLineRepository lines;

	@Mock
	private CatalogApi catalog;

	@Mock
	private ProfileApi profile;

	private FeedService service;

	@BeforeEach
	void setUp() {
		service = new FeedService(lines, catalog, profile);
	}

	@Test
	void anEmptyFeedYieldsAnEmptyPageWithNoCursor() {
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of());

		FeedPage page = service.readRecent(20);

		assertThat(page.lines()).isEmpty();
		assertThat(page.nextCursor()).isNull();
	}

	@Test
	void aPageShorterThanRequestedCarriesNoCursor() {
		FeedLine line = line();
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of(line));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(line));
		given(profile.publicUsernames(any())).willReturn(Map.of(line.getUserId(), "alice"));

		FeedPage page = service.readRecent(1);

		assertThat(page.lines()).hasSize(1);
		assertThat(page.nextCursor()).isNull();
	}

	// Fetching size+1 and trimming the extra row is the only way to say
	// "there is more" without guessing from a page that happens to come back
	// exactly `size` long — this pins the trim and the resulting cursor.
	@Test
	void aPageWithMoreBeyondItIsTrimmedToSizeAndCarriesACursor() {
		FeedLine newer = line();
		FeedLine older = line();
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of(newer, older));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(newer, older));
		given(profile.publicUsernames(any()))
				.willReturn(Map.of(newer.getUserId(), "alice", older.getUserId(), "bob"));

		FeedPage page = service.readRecent(1);

		assertThat(page.lines()).hasSize(1);
		assertThat(page.lines().getFirst().username()).isEqualTo("alice");
		assertThat(page.nextCursor()).isNotNull();
	}

	@Test
	void aLineWhoseOwnerIsNotCurrentlyPublicIsDropped() {
		FeedLine line = line();
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of(line));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(line));
		given(profile.publicUsernames(any())).willReturn(Map.of());

		FeedPage page = service.readRecent(1);

		assertThat(page.lines()).isEmpty();
	}

	@Test
	void aLineWhoseBeerDoesNotResolveIsDropped() {
		FeedLine line = line();
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of(line));
		given(catalog.getBeerSummaries(any())).willReturn(Map.of());
		given(profile.publicUsernames(any())).willReturn(Map.of(line.getUserId(), "alice"));

		FeedPage page = service.readRecent(1);

		assertThat(page.lines()).isEmpty();
	}

	private static Map<UUID, BeerSummary> beerSummaries(FeedLine... resolvable) {
		Map<UUID, BeerSummary> beers = new HashMap<>();
		for (FeedLine line : resolvable) {
			beers.put(line.getBeerId(), new BeerSummary(line.getBeerId(), "Beer", "Brewery"));
		}
		return beers;
	}

	private static FeedLine line() {
		return FeedLine.bottleAdded(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, null, Instant.now());
	}

}
