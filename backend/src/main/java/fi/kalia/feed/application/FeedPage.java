package fi.kalia.feed.application;

import java.util.List;
import org.jspecify.annotations.Nullable;

/** A page of resolved feed lines, plus where to continue reading from. */
public record FeedPage(List<FeedLineView> lines, @Nullable String nextCursor) {

}
