package fi.kalia.feed.application;

import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import fi.kalia.profile.ProfileApi;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

@Service
@RequiredArgsConstructor
@Transactional
public class FeedService {

	// The feed serves a 30-day window over a table that keeps every row
	// (ADR-0058) — no deletion job, every query bounded instead.
	private static final int WINDOW_DAYS = 30;

	// One less than CatalogApi/ProfileApi's own batch-id cap: the lookahead
	// row below can push a page's distinct beer or user ids to size + 1, and
	// that must never cross what those batch reads accept.
	private static final int MAX_SIZE = 99;

	private final FeedLineRepository lines;

	private final CatalogApi catalog;

	private final ProfileApi profile;

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

	@Transactional(readOnly = true)
	public FeedPage readRecent(int size) {
		Assert.isTrue(size >= 1 && size <= MAX_SIZE, "size must be between 1 and " + MAX_SIZE);
		Instant cutoff = Instant.now().minus(WINDOW_DAYS, ChronoUnit.DAYS);
		// One extra row, trimmed below: the only way to say whether there is
		// more beyond this page without guessing from a page that happens to
		// come back exactly `size` long.
		List<FeedLine> fetched = lines.findByOccurredAtGreaterThanEqualOrderBySequenceNumberDesc(cutoff,
				PageRequest.of(0, size + 1));
		boolean hasMore = fetched.size() > size;
		List<FeedLine> page = hasMore ? fetched.subList(0, size) : fetched;

		Set<UUID> beerIds = page.stream().map(FeedLine::getBeerId).collect(Collectors.toSet());
		Set<UUID> userIds = page.stream().map(FeedLine::getUserId).collect(Collectors.toSet());
		Map<UUID, BeerSummary> beers = catalog.getBeerSummaries(beerIds);
		Map<UUID, String> usernames = profile.publicUsernames(userIds);

		// A line whose beer or person no longer resolves is dropped, not
		// rendered with a blank — a page may end up shorter than `size`;
		// the client pages on the cursor below, never on the count.
		List<FeedLineView> resolved = page.stream()
				.filter(line -> usernames.containsKey(line.getUserId()) && beers.containsKey(line.getBeerId()))
				.map(line -> toView(line, usernames.get(line.getUserId()), beers.get(line.getBeerId())))
				.toList();

		String nextCursor = hasMore ? encodeCursor(page.getLast().getSequenceNumber()) : null;
		return new FeedPage(resolved, nextCursor);
	}

	private static FeedLineView toView(FeedLine line, String username, BeerSummary beer) {
		return new FeedLineView(username, beer.name(), beer.brewery(), line.getQuantity(), line.getBrewedDate(),
				line.getOccurredAt());
	}

	// Opaque to the client: a plain sequence number would invite a caller to
	// construct or increment one instead of round-tripping it as given.
	private static String encodeCursor(long sequenceNumber) {
		return Base64.getUrlEncoder().withoutPadding()
				.encodeToString(Long.toString(sequenceNumber).getBytes(StandardCharsets.UTF_8));
	}

}
