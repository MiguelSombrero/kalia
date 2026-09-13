package fi.kalia.feed.web;

import fi.kalia.feed.application.FeedPage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.jspecify.annotations.Nullable;

@Schema(description = "A page of the feed, newest first")
public record FeedPageDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<FeedLineDto> content,
		@Schema(description = "Opaque; pass back to continue reading. Null when this page reached "
				+ "the end of the served window.") @Nullable String nextCursor) {

	static FeedPageDto from(FeedPage page) {
		return new FeedPageDto(page.lines().stream().map(FeedLineDto::from).toList(), page.nextCursor());
	}

}
