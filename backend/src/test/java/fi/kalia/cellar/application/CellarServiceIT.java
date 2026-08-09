package fi.kalia.cellar.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.cellar.domain.Bottle;
import fi.kalia.cellar.domain.BottleRepository;
import fi.kalia.cellar.domain.ContainerType;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class CellarServiceIT {

	@Autowired
	private EntryRepository entries;

	@Autowired
	private BottleRepository bottles;

	@Autowired
	private BeerRepository beers;

	private CellarService service;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		service = new CellarService(entries, bottles, new CatalogApi(beers));
		beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
	}

	@Test
	void addingABottleCreatesTheEntryOnFirstUse() {
		UUID userId = UUID.randomUUID();

		service.addBottle(userId, beerId, ContainerType.BOTTLE, null, null);

		Entry entry = entries.findByUserIdAndBeerId(userId, beerId).orElseThrow();
		assertThat(entry.quantity()).isEqualTo(1);
	}

	@Test
	void addingASecondBottleReusesTheSameEntry() {
		UUID userId = UUID.randomUUID();

		service.addBottle(userId, beerId, ContainerType.BOTTLE, null, null);
		service.addBottle(userId, beerId, ContainerType.CAN, null, null);

		Entry entry = entries.findByUserIdAndBeerId(userId, beerId).orElseThrow();
		assertThat(entry.quantity()).isEqualTo(2);
	}

	@Test
	void bulkAddingCreatesThatManyIndependentlyRemovableRows() {
		UUID userId = UUID.randomUUID();

		List<Bottle> created = service.addBottles(userId, beerId, 6, ContainerType.BOTTLE, null, null);

		assertThat(created).hasSize(6);
		Entry entry = entries.findByUserIdAndBeerId(userId, beerId).orElseThrow();
		assertThat(entry.quantity()).isEqualTo(6);

		service.removeBottle(userId, created.get(0).getId());

		Entry afterRemoval = entries.findByUserIdAndBeerId(userId, beerId).orElseThrow();
		assertThat(afterRemoval.quantity()).isEqualTo(5);
		assertThat(bottles.existsById(created.get(0).getId())).isFalse();
		assertThat(bottles.existsById(created.get(1).getId())).isTrue();
	}

	@Test
	void rejectsABeerIdThatDoesNotExistInTheCatalog() {
		UUID unknownBeerId = UUID.randomUUID();

		assertThatThrownBy(() -> service.addBottle(UUID.randomUUID(), unknownBeerId, ContainerType.BOTTLE, null, null))
				.isInstanceOf(BeerNotFoundException.class);
	}

	@Test
	void refusesToRemoveABottleOwnedBySomeoneElse() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottle(owner, beerId, ContainerType.BOTTLE, null, null);

		assertThatThrownBy(() -> service.removeBottle(UUID.randomUUID(), bottle.getId()))
				.isInstanceOf(BottleNotFoundException.class);
		assertThat(bottles.existsById(bottle.getId())).isTrue();
	}

}
