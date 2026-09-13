package fi.kalia.feed.application;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * A page of resolved feed lines, plus where to continue reading from.
 * {@code startOver} is true only for a "since" cursor older than the served
 * window — a hole the caller must not mistake for a partial result.
 */
public record FeedPage(List<FeedLineView> lines, @Nullable String nextCursor, boolean startOver) {

}
