package fi.kalia.feed.web;

import fi.kalia.feed.application.FeedLineView;
import io.swagger.v3.oas.annotations.media.Schema;
import java.time.Instant;
import java.time.LocalDate;
import org.jspecify.annotations.Nullable;

@Schema(description = "One event in the feed: a person adding bottles to their cellar")
public record FeedLineDto(
		@Schema(description = "The owner's username, as copied from the identity provider",
				requiredMode = Schema.RequiredMode.REQUIRED) String username,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String beerName,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String brewery,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) int quantity,
		@Schema(description = "Null when not recorded") @Nullable LocalDate brewedDate,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant occurredAt) {

	static FeedLineDto from(FeedLineView view) {
		return new FeedLineDto(view.username(), view.beerName(), view.brewery(), view.quantity(),
				view.brewedDate(), view.occurredAt());
	}

}
