package fi.kalia.feed.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import fi.kalia.profile.ProfileApi;
import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FeedServiceTest {

	private static final Instant NOW = Instant.parse("2026-10-23T12:00:00Z");

	private static final Instant CUTOFF = NOW.minus(30, ChronoUnit.DAYS);

	@Mock
	private FeedLineRepository lines;

	@Mock
	private CatalogApi catalog;

	@Mock
	private ProfileApi profile;

	// A real codec, not a mock: it is what mints and rejects test cursors, so
	// the tests exercise the same signing/opacity behavior production does.
	private final FeedCursorCodec codec = new FeedCursorCodec("0123456789abcdef0123456789abcdef");

	private FeedService service;

	@BeforeEach
	void setUp() {
		service = new FeedService(lines, catalog, profile, codec, Clock.fixed(NOW, ZoneOffset.UTC));
	}

	@Test
	void aLineIsResolvedToTheBeerAsTheCatalogDescribesIt() {
		FeedLine line = line();
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of(line));
		given(catalog.getBeerSummaries(any())).willReturn(Map.of(line.getBeerId(), new BeerSummary(line.getBeerId(),
				"KBS", "Founders Brewing Co.", "Imperial Stout", new BigDecimal("12.0"))));
		given(profile.publicUsernames(any())).willReturn(Map.of(line.getUserId(), "alice"));

		FeedLineView view = service.readRecent(20).lines().getFirst();

		assertThat(view.beerId()).isEqualTo(line.getBeerId());
		assertThat(view.beerName()).isEqualTo("KBS");
		assertThat(view.brewery()).isEqualTo("Founders Brewing Co.");
		assertThat(view.style()).isEqualTo("Imperial Stout");
		assertThat(view.abv()).isEqualByComparingTo("12.0");
	}

	@Test
	void theRecentWindowStartsThirtyDaysBeforeTheClocksInstant() {
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any())).willReturn(List.of());

		service.readRecent(20);

		then(lines).should().findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(eq(CUTOFF), any());
	}

	@Test
	void theWindowOlderLinesAreReadFromStartsThirtyDaysBeforeTheClocksInstant() {
		given(lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(anyLong(), any(),
				any())).willReturn(List.of());

		service.readBefore(codec.encode(42L), 20);

		then(lines).should().findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(
				eq(42L), eq(CUTOFF), any());
	}

	@Test
	void aCursorJustInsideTheClocksWindowIsServedAndJustOutsideAnswersStartOver() {
		FeedLine insideAnchor = mock(FeedLine.class);
		given(insideAnchor.getOccurredAt()).willReturn(CUTOFF);
		FeedLine outsideAnchor = mock(FeedLine.class);
		given(outsideAnchor.getOccurredAt()).willReturn(CUTOFF.minusSeconds(1));
		given(lines.findBySequenceNumber(42L)).willReturn(Optional.of(insideAnchor));
		given(lines.findBySequenceNumber(43L)).willReturn(Optional.of(outsideAnchor));
		given(lines.findBySequenceNumberGreaterThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberAsc(eq(42L),
				eq(CUTOFF), any())).willReturn(List.of());

		assertThat(service.readSince(codec.encode(42L), 20).startOver()).isFalse();
		assertThat(service.readSince(codec.encode(43L), 20).startOver()).isTrue();
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

	@Test
	void aBatchWithNoVisibleLineIsFollowedByTheNextOne() {
		FeedLine hidden = line();
		FeedLine alsoHidden = line();
		FeedLine shown = line();
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of(hidden, alsoHidden));
		given(lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(anyLong(),
				any(), any())).willReturn(List.of(shown));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(hidden, alsoHidden, shown));
		given(profile.publicUsernames(any())).willReturn(Map.of(shown.getUserId(), "shown"));

		FeedPage page = service.readRecent(1);

		assertThat(page.lines()).extracting(FeedLineView::username).containsExactly("shown");
		assertThat(page.nextCursor()).isNull();
	}

	@Test
	void aRequestStopsReadingAfterTenBatchesWithACursorToResumeFrom() {
		given(lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(any(), any()))
				.willReturn(List.of(line(), line()));
		given(lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(anyLong(),
				any(), any())).willReturn(List.of(line(), line()));
		given(profile.publicUsernames(any())).willReturn(Map.of());

		FeedPage page = service.readRecent(1);

		assertThat(page.lines()).isEmpty();
		assertThat(page.nextCursor()).isNotNull();
		then(lines).should(times(9))
				.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(anyLong(), any(),
						any());
	}

	// A poll that finds nothing visible is the ordinary case, not a page to
	// fill: one batch, and its cursor moves the poller past it.
	@Test
	void sinceDoesNotReadOnPastABatchWithNoVisibleLine() {
		FeedLine anchor = mock(FeedLine.class);
		given(anchor.getOccurredAt()).willReturn(NOW);
		given(lines.findBySequenceNumber(42L)).willReturn(Optional.of(anchor));
		given(lines.findBySequenceNumberGreaterThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberAsc(eq(42L),
				any(), any())).willReturn(List.of(line(), line()));
		given(profile.publicUsernames(any())).willReturn(Map.of());

		FeedPage page = service.readSince(codec.encode(42L), 1);

		assertThat(page.lines()).isEmpty();
		assertThat(page.nextCursor()).isNotNull();
		then(lines).should(times(1))
				.findBySequenceNumberGreaterThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberAsc(anyLong(), any(),
						any());
	}

	@Test
	void sinceAMalformedCursorIsRejected() {
		assertThatThrownBy(() -> service.readSince("not-a-valid-cursor!!", 20))
				.isInstanceOf(InvalidFeedCursorException.class);
	}

	// A well-formed signature for a sequence number no row backs answers
	// startOver, not an error: the signature already proves this server once
	// issued it, and ADR-0058's retention means the only honest reason it is
	// missing now is that it aged out.
	@Test
	void sinceASignedCursorWithNoBackingRowAnswersStartOver() {
		given(lines.findBySequenceNumber(42L)).willReturn(Optional.empty());

		FeedPage page = service.readSince(codec.encode(42L), 20);

		assertThat(page.lines()).isEmpty();
		assertThat(page.startOver()).isTrue();
	}

	// The opacity requirement in full: a value with the right shape (a real,
	// existing sequence number, correctly base64url-encoded) but without this
	// server's signature is rejected exactly like a garbage string — a client
	// cannot come to depend on the cursor being "just a number".
	@Test
	void sinceAWellShapedButUnsignedCursorIsRejected() {
		assertThatThrownBy(() -> service.readSince("NDI", 20)).isInstanceOf(InvalidFeedCursorException.class);
	}

	@Test
	void sinceACursorOlderThanTheWindowAnswersStartOver() {
		FeedLine anchor = mock(FeedLine.class);
		given(anchor.getOccurredAt()).willReturn(NOW.minus(40, ChronoUnit.DAYS));
		given(lines.findBySequenceNumber(42L)).willReturn(Optional.of(anchor));

		FeedPage page = service.readSince(codec.encode(42L), 20);

		assertThat(page.lines()).isEmpty();
		assertThat(page.nextCursor()).isNull();
		assertThat(page.startOver()).isTrue();
	}

	@Test
	void sinceAValidCursorReturnsNewerLinesNewestFirst() {
		FeedLine anchor = mock(FeedLine.class);
		given(anchor.getOccurredAt()).willReturn(NOW);
		given(lines.findBySequenceNumber(42L)).willReturn(Optional.of(anchor));
		FeedLine older = line();
		FeedLine newer = line();
		given(lines.findBySequenceNumberGreaterThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberAsc(eq(42L),
				any(), any())).willReturn(List.of(older, newer));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(older, newer));
		given(profile.publicUsernames(any()))
				.willReturn(Map.of(older.getUserId(), "older", newer.getUserId(), "newer"));

		FeedPage page = service.readSince(codec.encode(42L), 20);

		assertThat(page.lines()).extracting(FeedLineView::username).containsExactly("newer", "older");
		assertThat(page.nextCursor()).isNull();
		assertThat(page.startOver()).isFalse();
	}

	@Test
	void sinceATruncatedResultCarriesACursorToTheNearestNewRow() {
		FeedLine anchor = mock(FeedLine.class);
		given(anchor.getOccurredAt()).willReturn(NOW);
		given(lines.findBySequenceNumber(42L)).willReturn(Optional.of(anchor));
		FeedLine nearest = line();
		FeedLine furthest = line();
		given(lines.findBySequenceNumberGreaterThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberAsc(eq(42L),
				any(), any())).willReturn(List.of(nearest, furthest));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(nearest));
		given(profile.publicUsernames(any())).willReturn(Map.of(nearest.getUserId(), "nearest"));

		FeedPage page = service.readSince(codec.encode(42L), 1);

		assertThat(page.lines()).hasSize(1);
		assertThat(page.nextCursor()).isNotNull();
	}

	@Test
	void beforeAMalformedCursorIsRejected() {
		assertThatThrownBy(() -> service.readBefore("not-a-valid-cursor!!", 20))
				.isInstanceOf(InvalidFeedCursorException.class);
	}

	@Test
	void beforeAValidCursorReturnsOlderLinesNewestFirst() {
		FeedLine older = line();
		FeedLine newer = line();
		given(lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(eq(42L),
				any(), any())).willReturn(List.of(newer, older));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(newer, older));
		given(profile.publicUsernames(any()))
				.willReturn(Map.of(newer.getUserId(), "newer", older.getUserId(), "older"));

		FeedPage page = service.readBefore(codec.encode(42L), 20);

		assertThat(page.lines()).extracting(FeedLineView::username).containsExactly("newer", "older");
		assertThat(page.nextCursor()).isNull();
		assertThat(page.startOver()).isFalse();
	}

	// Reaching the edge of the retained window ends the walk with an empty,
	// cursor-less page rather than an error — the caller stops asking rather
	// than looping, and there is no "aged past the window" case to report the
	// way readSince has, since walking toward older history simply runs out.
	@Test
	void beforeAtTheEdgeOfTheWindowYieldsAnEmptyPageWithNoCursor() {
		given(lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(eq(42L),
				any(), any())).willReturn(List.of());

		FeedPage page = service.readBefore(codec.encode(42L), 20);

		assertThat(page.lines()).isEmpty();
		assertThat(page.nextCursor()).isNull();
		assertThat(page.startOver()).isFalse();
	}

	@Test
	void beforeATruncatedResultCarriesACursorToTheNearestOlderRow() {
		FeedLine nearest = line();
		FeedLine furthest = line();
		given(lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(eq(42L),
				any(), any())).willReturn(List.of(nearest, furthest));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(nearest));
		given(profile.publicUsernames(any())).willReturn(Map.of(nearest.getUserId(), "nearest"));

		FeedPage page = service.readBefore(codec.encode(42L), 1);

		assertThat(page.lines()).hasSize(1);
		assertThat(page.nextCursor()).isNotNull();
	}

	@Test
	void beforeALineWhoseOwnerIsNotCurrentlyPublicIsDropped() {
		FeedLine line = line();
		given(lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(eq(42L),
				any(), any())).willReturn(List.of(line));
		given(catalog.getBeerSummaries(any())).willReturn(beerSummaries(line));
		given(profile.publicUsernames(any())).willReturn(Map.of());

		FeedPage page = service.readBefore(codec.encode(42L), 20);

		assertThat(page.lines()).isEmpty();
	}

	private static Map<UUID, BeerSummary> beerSummaries(FeedLine... resolvable) {
		Map<UUID, BeerSummary> beers = new HashMap<>();
		for (FeedLine line : resolvable) {
			beers.put(line.getBeerId(), new BeerSummary(line.getBeerId(), "Beer", "Brewery", "IPA",
					new BigDecimal("6.5")));
		}
		return beers;
	}

	private static FeedLine line() {
		return FeedLine.bottleAdded(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(), 1, null, NOW);
	}

}
