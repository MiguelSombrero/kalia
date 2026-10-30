package fi.kalia.catalog;

import static org.assertj.core.api.Assertions.assertThat;

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
import org.springframework.jdbc.core.JdbcTemplate;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class CatalogModuleApiIT {

	@Autowired
	private BeerRepository beers;

	@Autowired
	private BreweryRepository breweries;

	@Autowired
	private JdbcTemplate jdbc;

	private CatalogApi api;

	@BeforeEach
	void setUp() {
		api = new CatalogApi(new CatalogService(beers, breweries));
	}

	@Test
	void resolvesNameBreweryStyleAndStrengthForEachRequestedBeer() {
		List<Beer> seeded = beers.findAll(Pageable.ofSize(2)).getContent();
		Beer first = seeded.get(0);
		Beer second = seeded.get(1);

		Map<UUID, BeerSummary> summaries = api.getBeerSummaries(List.of(first.getId(), second.getId()), null).found();

		assertThat(summaries).hasSize(2);
		assertThat(summaries.get(first.getId()))
				.isEqualTo(new BeerSummary(first.getId(), first.getName(), first.getBrewery().getName(),
						first.getStyle(), first.getAbv()));
		assertThat(summaries.get(second.getId()))
				.isEqualTo(new BeerSummary(second.getId(), second.getName(), second.getBrewery().getName(),
						second.getStyle(), second.getAbv()));
	}

	@Test
	void anUnknownBeerIdIsOmittedRatherThanCausingAnException() {
		Beer known = beers.findAll(Pageable.ofSize(1)).getContent().get(0);
		UUID unknown = UUID.randomUUID();

		Map<UUID, BeerSummary> summaries = api.getBeerSummaries(List.of(known.getId(), unknown), null).found();

		assertThat(summaries).containsOnlyKeys(known.getId());
	}

	@Test
	void aLookupOverTheIdCapResolvesABeerBeyondTheFirstChunk() {
		Beer known = beers.findAll(Pageable.ofSize(1)).getContent().get(0);
		List<UUID> ids = Stream.concat(Stream.generate(UUID::randomUUID).limit(CatalogApi.MAX_BATCH_IDS),
				Stream.of(known.getId())).toList();

		Map<UUID, BeerSummary> summaries = api.getBeerSummaries(ids, null).found();

		assertThat(summaries).containsOnlyKeys(known.getId());
	}

	@Test
	void everyBeerButAnApprovedOneIsWithheldFromAPublicReaderEvenBeyondTheFirstChunk() {
		List<Beer> seeded = beers.findAll(Pageable.ofSize(4)).getContent();
		UUID approved = seeded.get(0).getId();
		List<UUID> notApproved = List.of(seeded.get(1).getId(), seeded.get(2).getId(), seeded.get(3).getId());
		List<String> statuses = List.of("PENDING", "REJECTED", "REMOVED");
		for (int i = 0; i < notApproved.size(); i++) {
			jdbc.update("""
					UPDATE catalog.beer SET source = 'USER', wikidata_qid = NULL, moderation_status = ?,
					contributor_id = ? WHERE id = ?""", statuses.get(i), UUID.randomUUID(), notApproved.get(i));
		}
		List<UUID> ids = Stream.concat(Stream.generate(UUID::randomUUID).limit(CatalogApi.MAX_BATCH_IDS),
				Stream.concat(Stream.of(approved), notApproved.stream())).toList();

		assertThat(api.withheldFromPublic(ids)).containsExactlyInAnyOrderElementsOf(notApproved);
		assertThat(api.withheldFromPublic(List.of())).isEmpty();
	}

	@Test
	void emptyIdCollectionResolvesToAnEmptyMapWithoutError() {
		Map<UUID, BeerSummary> summaries = api.getBeerSummaries(List.of(), null).found();

		assertThat(summaries).isEmpty();
	}

}
