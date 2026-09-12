package fi.kalia.feed.web;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.json.JsonTest;
import org.springframework.boot.test.json.JacksonTester;

// A present "brewedDate": null doesn't match the generated `brewedDate?: string`
// type; verifies the configured ObjectMapper omits null fields entirely.
@JsonTest
class DtoSerializationIT {

	@Autowired
	private JacksonTester<FeedLineDto> feedLineJson;

	@Autowired
	private JacksonTester<FeedPageDto> feedPageJson;

	@Test
	void omitsNullBrewedDateFromFeedLineJson() throws Exception {
		FeedLineDto line = new FeedLineDto("alice", "AleSmith IPA", "AleSmith Brewing Company", 6, null,
				Instant.now());

		String json = feedLineJson.write(line).getJson();

		assertThat(json).doesNotContain("brewedDate");
	}

	@Test
	void omitsNullNextCursorFromFeedPageJson() throws Exception {
		FeedPageDto page = new FeedPageDto(List.of(), null);

		String json = feedPageJson.write(page).getJson();

		assertThat(json).doesNotContain("nextCursor");
	}

}
