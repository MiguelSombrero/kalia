package fi.kalia.feed.web;

import fi.kalia.feed.application.FeedLineView;
import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;
import org.jspecify.annotations.Nullable;

@Schema(description = "One event in the feed: a person adding bottles to their cellar")
public record FeedLineDto(
		@Schema(description = "The owner's username, as copied from the identity provider",
				requiredMode = Schema.RequiredMode.REQUIRED) String username,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) UUID beerId,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String beerName,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) String brewery,
		@Schema(description = "The beer's style as the catalog records it now",
				requiredMode = Schema.RequiredMode.REQUIRED) String style,
		@Schema(description = "Alcohol by volume, percent, as the catalog records it now",
				requiredMode = Schema.RequiredMode.REQUIRED) BigDecimal abv,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) int quantity,
		@Schema(description = "Null when not recorded") @Nullable LocalDate brewedDate,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) Instant occurredAt,
		@Schema(description = """
				Opaque; pass as this event's own position to the since parameter to read everything recorded \
				after it""", requiredMode = Schema.RequiredMode.REQUIRED) String cursor) {

	static FeedLineDto from(FeedLineView view) {
		return new FeedLineDto(view.username(), view.beerId(), view.beerName(), view.brewery(), view.style(),
				view.abv(), view.quantity(), view.brewedDate(), view.occurredAt(), view.cursor());
	}

}
