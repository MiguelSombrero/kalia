package fi.kalia.feed.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import fi.kalia.profile.ProfileApi;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
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

	private final FeedLineRepository lines;

	private final CatalogApi catalog;

	private final ProfileApi profile;

	private final FeedCursorCodec cursorCodec;

	public void recordBottleAdded(UUID eventId, UUID userId, UUID beerId, int quantity,
			@Nullable LocalDate brewedDate, Instant occurredAt) {
		// Do not remove: the event publication registry is at-least-once, so
		// this may run twice for one BottleAdded (ADR-0058). eventId is the
		// idempotency key.
		if (lines.existsByEventId(eventId)) {
			return;
		}
		lines.save(FeedLine.bottleAdded(eventId, userId, beerId, quantity, brewedDate, occurredAt));
	}

	// Do not call with size outside 1-99 — FeedController's Bean Validation is
	// the only caller and the only bound: below 1, the lookahead trim indexes
	// an empty page's getLast(); above 99, the lookahead row can push a page's
	// distinct beer or user ids past CatalogApi/ProfileApi's own batch-id cap.
	@Transactional(readOnly = true)
	public FeedPage readRecent(int size) {
		Instant cutoff = Instant.now().minus(WINDOW_DAYS, ChronoUnit.DAYS);
		List<FeedLine> fetched = lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(cutoff,
				PageRequest.of(0, size + 1));
		Trimmed trimmed = trim(fetched, size);
		return new FeedPage(resolve(trimmed.page()), trimmed.nextCursor(), false);
	}

	// Same bound as readRecent above; `since` is validated separately by
	// cursorCodec.decode.
	@Transactional(readOnly = true)
	public FeedPage readSince(String cursor, int size) {
		long sequenceNumber = cursorCodec.decode(cursor);
		Instant cutoff = Instant.now().minus(WINDOW_DAYS, ChronoUnit.DAYS);
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
	// exactly `size` long. `fetched` is sorted in whichever direction the
	// caller reads in, so `getLast()` is always the correct boundary to
	// resume from next, forward or backward alike.
	private Trimmed trim(List<FeedLine> fetched, int size) {
		boolean hasMore = fetched.size() > size;
		List<FeedLine> page = hasMore ? fetched.subList(0, size) : fetched;
		String nextCursor = hasMore ? cursorCodec.encode(page.getLast().getSequenceNumber()) : null;
		return new Trimmed(page, nextCursor);
	}

	private record Trimmed(List<FeedLine> page, @Nullable String nextCursor) {

	}

	// A line whose beer or person no longer resolves is dropped. Shared by
	// readRecent and readSince so the visibility filter cannot diverge
	// between them.
	private List<FeedLineView> resolve(List<FeedLine> page) {
		Set<UUID> beerIds = page.stream().map(FeedLine::getBeerId).collect(Collectors.toSet());
		Set<UUID> userIds = page.stream().map(FeedLine::getUserId).collect(Collectors.toSet());
		Map<UUID, BeerSummary> beers = catalog.getBeerSummaries(beerIds);
		Map<UUID, String> usernames = profile.publicUsernames(userIds);

		return page.stream()
				.filter(line -> usernames.containsKey(line.getUserId()) && beers.containsKey(line.getBeerId()))
				.map(line -> toView(line, usernames.get(line.getUserId()), beers.get(line.getBeerId())))
				.toList();
	}

	private FeedLineView toView(FeedLine line, String username, BeerSummary beer) {
		return new FeedLineView(cursorCodec.encode(line.getSequenceNumber()), username, beer.name(), beer.brewery(),
				line.getQuantity(), line.getBrewedDate(), line.getOccurredAt());
	}

}
