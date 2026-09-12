package fi.kalia.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BreweryRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class CatalogApiIT {

	@Autowired
	private BeerRepository beers;

	@Autowired
	private BreweryRepository breweries;

	private CatalogApi api;

	@BeforeEach
	void setUp() {
		api = new CatalogApi(new CatalogService(beers, breweries));
	}

	@Test
	void resolvesNameAndBreweryForEachRequestedBeer() {
		List<Beer> seeded = beers.findAll(Pageable.ofSize(2)).getContent();
		Beer first = seeded.get(0);
		Beer second = seeded.get(1);

		Map<UUID, BeerSummary> summaries = api.getBeerSummaries(List.of(first.getId(), second.getId()));

		assertThat(summaries).hasSize(2);
		assertThat(summaries.get(first.getId()))
				.isEqualTo(new BeerSummary(first.getId(), first.getName(), first.getBrewery().getName()));
		assertThat(summaries.get(second.getId()))
				.isEqualTo(new BeerSummary(second.getId(), second.getName(), second.getBrewery().getName()));
	}

	@Test
	void anUnknownBeerIdIsOmittedRatherThanCausingAnException() {
		Beer known = beers.findAll(Pageable.ofSize(1)).getContent().get(0);
		UUID unknown = UUID.randomUUID();

		Map<UUID, BeerSummary> summaries = api.getBeerSummaries(List.of(known.getId(), unknown));

		assertThat(summaries).containsOnlyKeys(known.getId());
	}

	@Test
	void aRequestOverTheIdCapIsRejectedRatherThanExecuted() {
		List<UUID> tooMany = Stream.generate(UUID::randomUUID).limit(101).toList();

		assertThatThrownBy(() -> api.getBeerSummaries(tooMany)).isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void emptyIdCollectionResolvesToAnEmptyMapWithoutError() {
		Map<UUID, BeerSummary> summaries = api.getBeerSummaries(List.of());

		assertThat(summaries).isEmpty();
	}

}
