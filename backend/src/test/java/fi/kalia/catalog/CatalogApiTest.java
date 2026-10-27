package fi.kalia.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.BDDMockito.given;

import fi.kalia.catalog.application.CatalogService;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CatalogApiTest {

	@Mock
	private CatalogService catalog;

	@Test
	void aLookupOverTheIdCapIsServedInChunksNoneOverTheCap() {
		List<Collection<UUID>> lookups = new ArrayList<>();
		given(catalog.getBeerSummaries(anyCollection(), isNull())).willAnswer(invocation -> {
			lookups.add(List.copyOf(invocation.<Collection<UUID>>getArgument(0)));
			return new BeerSummaries(Map.of(), Set.of());
		});
		List<UUID> ids = Stream.generate(UUID::randomUUID).limit(2L * CatalogApi.MAX_BATCH_IDS + 1).toList();

		new CatalogApi(catalog).getBeerSummaries(ids, null);

		assertThat(lookups).hasSize(3).allSatisfy(chunk -> assertThat(chunk).hasSizeLessThanOrEqualTo(
				CatalogApi.MAX_BATCH_IDS));
		assertThat(lookups.stream().flatMap(Collection::stream)).containsExactlyInAnyOrderElementsOf(ids);
	}

}
