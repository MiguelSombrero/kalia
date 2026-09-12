package fi.kalia.cellar.application;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.cellar.BottleAdded;
import fi.kalia.cellar.domain.ContainerType;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.modulith.test.AssertablePublishedEvents;

/**
 * The proving test ADR-0053 names: {@link CellarService#addBottles} is called
 * on its real path, not {@code entries.save} directly, so a production caller
 * that skipped the save could not make this pass.
 */
@ApplicationModuleTest(mode = BootstrapMode.ALL_DEPENDENCIES)
@Import(TestcontainersConfiguration.class)
class CellarServiceEventPublishingIT {

	@Autowired
	private CellarService cellarService;

	@Autowired
	private BeerRepository beers;

	@Test
	void addingABottlePublishesBottleAdded(AssertablePublishedEvents events) {
		UUID userId = UUID.randomUUID();
		UUID beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
		LocalDate brewedDate = LocalDate.now().minusMonths(1);

		cellarService.addBottles(userId, beerId, 1, ContainerType.BOTTLE, brewedDate, null);

		assertThat(events).contains(BottleAdded.class)
				.matchingValue(BottleAdded::userId, userId)
				.matchingValue(BottleAdded::beerId, beerId)
				.matchingValue(BottleAdded::quantity, 1)
				.matchingValue(BottleAdded::brewedDate, brewedDate);
	}

	@Test
	void bulkAddPublishesOneEventCarryingTheCount(AssertablePublishedEvents events) {
		UUID userId = UUID.randomUUID();
		UUID beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();

		cellarService.addBottles(userId, beerId, 6, ContainerType.BOTTLE, null, null);

		assertThat(events.ofType(BottleAdded.class)).hasSize(1);
		assertThat(events).contains(BottleAdded.class)
				.matchingValue(BottleAdded::userId, userId)
				.matchingValue(BottleAdded::quantity, 6);
	}

}
