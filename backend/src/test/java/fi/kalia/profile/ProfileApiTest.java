package fi.kalia.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.BDDMockito.given;

import fi.kalia.profile.application.ProfileService;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProfileApiTest {

	@Mock
	private ProfileService profile;

	@Test
	void aLookupOverTheIdCapIsServedInChunksNoneOverTheCap() {
		List<Collection<UUID>> lookups = new ArrayList<>();
		given(profile.publicUsernames(anyCollection())).willAnswer(invocation -> {
			Collection<UUID> chunk = List.copyOf(invocation.<Collection<UUID>>getArgument(0));
			lookups.add(chunk);
			return chunk.stream().collect(Collectors.toMap(Function.identity(), UUID::toString));
		});
		List<UUID> ids = Stream.generate(UUID::randomUUID).limit(2L * ProfileApi.MAX_BATCH_IDS + 1).toList();

		Map<UUID, String> usernames = new ProfileApi(profile).publicUsernames(ids);

		assertThat(lookups).hasSize(3).allSatisfy(chunk -> assertThat(chunk).hasSizeLessThanOrEqualTo(
				ProfileApi.MAX_BATCH_IDS));
		assertThat(usernames).containsOnlyKeys(ids);
	}

}
