package fi.kalia.feed.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import fi.kalia.profile.ProfileApi;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FeedService {

	// The feed serves a 30-day window over a table that keeps every row
	// (ADR-0058) — no deletion job, every query bounded instead.
	private static final int WINDOW_DAYS = 30;

	// The feed is public, so a run of private lines must cost any caller a
	// bounded scan, not one as long as the run (ADR-0042).
	private static final int MAX_BATCHES_PER_REQUEST = 10;

	private final FeedLineRepository lines;

	private final CatalogApi catalog;

	private final ProfileApi profile;

	private final FeedCursorCodec cursorCodec;

	private final Clock clock;

	public void recordBottleAdded(UUID eventId, UUID userId, UUID beerId, int quantity,
			@Nullable LocalDate brewedDate, Instant occurredAt) {
		// Do not remove: a publication not marked complete is resubmitted
		// (ADR-0081), so this may run twice for one BottleAdded. eventId is
		// the idempotency key (ADR-0058).
		if (lines.existsByEventId(eventId)) {
			return;
		}
		lines.save(FeedLine.bottleAdded(eventId, userId, beerId, quantity, brewedDate, occurredAt));
	}

	// Do not call with size below 1 — FeedController's Bean Validation is the
	// only caller and the only bound: a full page of none has no last line
	// to hand back as its cursor.
	@Transactional(readOnly = true)
	public FeedPage readRecent(int size) {
		return fillOlder(null, size);
	}

	// Same bound as readRecent above; `before` is validated the same way as
	// `since` below, but needs no anchor lookup: unlike catching up, walking
	// toward older history has no "aged past the window" case to report —
	// running out of rows within the cutoff is the ordinary way this ends.
	@Transactional(readOnly = true)
	public FeedPage readBefore(String cursor, int size) {
		return fillOlder(cursorCodec.decode(cursor), size);
	}

	private FeedPage fillOlder(@Nullable Long before, int size) {
		Instant cutoff = clock.instant().minus(WINDOW_DAYS, ChronoUnit.DAYS);
		PageRequest batch = PageRequest.of(0, size + 1);
		List<FeedLineView> page = new ArrayList<>();
		Long resumeBefore = before;
		for (int batchesRead = 0; batchesRead < MAX_BATCHES_PER_REQUEST; batchesRead++) {
			List<FeedLine> fetched = resumeBefore == null
					? lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(cutoff, batch)
					: lines.findBySequenceNumberLessThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(
							resumeBefore, cutoff, batch);
			List<FeedLineView> visible = resolve(fetched);
			boolean windowExhausted = fetched.size() <= size;
			int wanted = size - page.size();
			if (visible.size() >= wanted) {
				page.addAll(visible.subList(0, wanted));
				boolean hasMore = visible.size() > wanted || !windowExhausted;
				return new FeedPage(page, hasMore ? page.getLast().cursor() : null, false);
			}
			page.addAll(visible);
			if (windowExhausted) {
				return new FeedPage(page, null, false);
			}
			resumeBefore = fetched.getLast().getSequenceNumber();
		}
		return new FeedPage(page, cursorCodec.encode(resumeBefore), false);
	}

	// Same bound as readRecent above; `since` is validated separately by
	// cursorCodec.decode.
	@Transactional(readOnly = true)
	public FeedPage readSince(String cursor, int size) {
		long sequenceNumber = cursorCodec.decode(cursor);
		Instant cutoff = clock.instant().minus(WINDOW_DAYS, ChronoUnit.DAYS);
		Optional<FeedLine> anchor = lines.findBySequenceNumber(sequenceNumber);
		if (anchor.isEmpty() || anchor.get().getOccurredAt().isBefore(cutoff)) {
			return new FeedPage(List.of(), null, true);
		}

		List<FeedLine> fetched = lines.findBySequenceNumberGreaterThanAndOccurredAtGreaterThanEqualOrderBySequenceNumberAsc(
				sequenceNumber, cutoff, PageRequest.of(0, size + 1));
		Trimmed trimmed = trim(fetched, size);
		return new FeedPage(resolve(trimmed.page()).reversed(), trimmed.nextCursor(), false);
	}

	// One extra row, trimmed here: the only way to say whether there is more
	// beyond this page without guessing from a page that happens to come back
	// exactly `size` long. fillOlder reads its batches one row long for the
	// same reason.
	private Trimmed trim(List<FeedLine> fetched, int size) {
		boolean hasMore = fetched.size() > size;
		List<FeedLine> page = hasMore ? fetched.subList(0, size) : fetched;
		String nextCursor = hasMore ? cursorCodec.encode(page.getLast().getSequenceNumber()) : null;
		return new Trimmed(page, nextCursor);
	}

	private record Trimmed(List<FeedLine> page, @Nullable String nextCursor) {

	}

	// A line whose beer is awaiting approval, or whose person is not public, is dropped. Shared by
	// every read so the visibility filter cannot diverge between them.
	private List<FeedLineView> resolve(List<FeedLine> page) {
		Set<UUID> userIds = page.stream().map(FeedLine::getUserId).collect(Collectors.toSet());
		Map<UUID, String> usernames = profile.publicUsernames(userIds);
		List<FeedLine> publicLines = page.stream().filter(line -> usernames.containsKey(line.getUserId())).toList();
		Set<UUID> beerIds = publicLines.stream().map(FeedLine::getBeerId).collect(Collectors.toSet());
		Map<UUID, BeerSummary> beers = catalog.getBeerSummaries(beerIds, null).found();

		return publicLines.stream()
				.filter(line -> beers.containsKey(line.getBeerId()))
				.map(line -> toView(line, usernames.get(line.getUserId()), beers.get(line.getBeerId())))
				.toList();
	}

	private FeedLineView toView(FeedLine line, String username, BeerSummary beer) {
		return new FeedLineView(cursorCodec.encode(line.getSequenceNumber()), username, beer.id(), beer.name(),
				beer.brewery(), beer.style(), beer.abv(), line.getQuantity(), line.getBrewedDate(), line.getOccurredAt());
	}

}
