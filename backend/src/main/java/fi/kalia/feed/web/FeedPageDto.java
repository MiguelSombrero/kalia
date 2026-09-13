package fi.kalia.feed.web;

import fi.kalia.feed.application.FeedPage;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.jspecify.annotations.Nullable;

@Schema(description = "A page of the feed, newest first")
public record FeedPageDto(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<FeedLineDto> content,
		@Schema(description = """
				Opaque; non-null when there is more beyond this page. For a since read, pass it back as since \
				to fetch the rest of a truncated batch. For a plain read it marks that older history exists \
				beyond what is served here.""") @Nullable String nextCursor,
		@Schema(description = """
				True only for a since cursor older than the served window: content is empty and the caller has \
				a hole it must not mistake for a partial result — discard what it holds and request a fresh \
				first page instead""",
				requiredMode = Schema.RequiredMode.REQUIRED) boolean startOver) {

	static FeedPageDto from(FeedPage page) {
		return new FeedPageDto(page.lines().stream().map(FeedLineDto::from).toList(), page.nextCursor(),
				page.startOver());
	}

}
