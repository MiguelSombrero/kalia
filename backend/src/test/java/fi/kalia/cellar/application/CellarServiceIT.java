package fi.kalia.cellar.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BreweryRepository;
import fi.kalia.cellar.domain.Bottle;
import fi.kalia.cellar.domain.ContainerType;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
import fi.kalia.cellar.domain.EntrySummary;
import fi.kalia.cellar.domain.InvalidBottleException;
import jakarta.persistence.EntityManagerFactory;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class CellarServiceIT {

	// Spied so updateBottleSavesThroughTheAggregateRoot can assert the write
	// path ends in entries.save(root); every other test uses it as the real bean.
	@MockitoSpyBean
	private EntryRepository entries;

	@Autowired
	private BeerRepository beers;

	@Autowired
	private BreweryRepository breweries;

	@Autowired
	private TestEntityManager testEntityManager;

	@Autowired
	private EntityManagerFactory entityManagerFactory;

	private CellarService service;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		service = new CellarService(entries, new CatalogApi(new CatalogService(beers, breweries)));
		beerId = beers.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
	}

	@Test
	void addingABottleCreatesTheEntryOnFirstUse() {
		UUID userId = UUID.randomUUID();

		service.addBottles(userId, beerId, 1, ContainerType.BOTTLE, null, null);

		Entry entry = entries.findByUserIdAndBeerId(userId, beerId).orElseThrow();
		assertThat(entry.quantity()).isEqualTo(1);
	}

	@Test
	void addingASecondBottleReusesTheSameEntry() {
		UUID userId = UUID.randomUUID();

		service.addBottles(userId, beerId, 1, ContainerType.BOTTLE, null, null);
		service.addBottles(userId, beerId, 1, ContainerType.CAN, null, null);

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
		assertThat(entries.findByBottleIdAndUserId(created.get(0).getId(), userId)).isEmpty();
		assertThat(entries.findByBottleIdAndUserId(created.get(1).getId(), userId)).isPresent();
	}

	@Test
	void removingABottleIssuesExactlyOneDelete() {
		UUID userId = UUID.randomUUID();
		List<Bottle> created = service.addBottles(userId, beerId, 3, ContainerType.BOTTLE, null, null);
		Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();
		statistics.clear();

		service.removeBottle(userId, created.get(0).getId());
		testEntityManager.flush();

		assertThat(statistics.getEntityDeleteCount())
				.as("the orphan-removal cascade must fire once, not zero times and not twice")
				.isEqualTo(1);
	}

	@Test
	void removingAnEntrysLastBottleDeletesTheEntry() {
		UUID userId = UUID.randomUUID();
		Bottle only = service.addBottles(userId, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();

		service.removeBottle(userId, only.getId());

		assertThat(service.listEntries(userId)).isEmpty();
		assertThat(entries.findByUserIdAndBeerId(userId, beerId)).isEmpty();
	}

	@Test
	void reAddingABeerAfterItsEntryEmptiedCreatesAFreshEntryWithoutColliding() {
		UUID userId = UUID.randomUUID();
		Bottle first = service.addBottles(userId, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();
		UUID firstEntryId = entries.findByUserIdAndBeerId(userId, beerId).orElseThrow().getId();

		service.removeBottle(userId, first.getId());
		// The emptied entry's delete and the fresh entry's insert reach the
		// database in separate requests in production; flush the delete before
		// re-adding so this single-transaction test matches that ordering.
		testEntityManager.flush();
		testEntityManager.clear();

		service.addBottles(userId, beerId, 1, ContainerType.CAN, null, null);

		Entry fresh = entries.findByUserIdAndBeerId(userId, beerId).orElseThrow();
		assertThat(fresh.getId()).isNotEqualTo(firstEntryId);
		assertThat(fresh.quantity()).isEqualTo(1);
	}

	@Test
	void rejectsABeerIdThatDoesNotExistInTheCatalog() {
		UUID unknownBeerId = UUID.randomUUID();

		assertThatThrownBy(() -> service.addBottles(UUID.randomUUID(), unknownBeerId, 1, ContainerType.BOTTLE, null, null))
				.isInstanceOf(BeerNotFoundException.class);
	}

	@Test
	void refusesToRemoveABottleOwnedBySomeoneElse() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();

		assertThatThrownBy(() -> service.removeBottle(UUID.randomUUID(), bottle.getId()))
				.isInstanceOf(BottleNotFoundException.class);
		assertThat(entries.findByBottleIdAndUserId(bottle.getId(), owner)).isPresent();
	}

	@Test
	void listEntriesReportsOnlyTheCallersEntriesWithTheirDerivedQuantity() {
		UUID owner = UUID.randomUUID();
		service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null);
		service.addBottles(owner, beerId, 1, ContainerType.CAN, null, null);
		service.addBottles(UUID.randomUUID(), beerId, 1, ContainerType.KEG, null, null);

		List<EntrySummary> summaries = service.listEntries(owner);

		assertThat(summaries).hasSize(1);
		assertThat(summaries.get(0).getQuantity()).isEqualTo(2);
	}

	@Test
	void listBottlesReturnsAnEntrysBottles() {
		UUID owner = UUID.randomUUID();
		service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null);
		Entry entry = entries.findByUserIdAndBeerId(owner, beerId).orElseThrow();

		List<Bottle> result = service.listBottles(owner, entry.getId());

		assertThat(result).hasSize(1);
	}

	@Test
	void readPublicCellarReturnsTheOwnersEntriesEachWithItsBottles() {
		UUID owner = UUID.randomUUID();
		service.addBottles(owner, beerId, 2, ContainerType.BOTTLE, null, null);
		testEntityManager.flush();
		testEntityManager.clear();

		List<Entry> cellar = service.readPublicCellar(owner);

		assertThat(cellar).hasSize(1);
		assertThat(cellar.getFirst().getBottles()).hasSize(2);
	}

	@Test
	void readPublicCellarIsEmptyForAnOwnerWithNoCellar() {
		assertThat(service.readPublicCellar(UUID.randomUUID())).isEmpty();
	}

	@Test
	void refusesToListBottlesOfAnEntryOwnedBySomeoneElse() {
		UUID owner = UUID.randomUUID();
		service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null);
		Entry entry = entries.findByUserIdAndBeerId(owner, beerId).orElseThrow();

		assertThatThrownBy(() -> service.listBottles(UUID.randomUUID(), entry.getId()))
				.isInstanceOf(EntryNotFoundException.class);
	}

	@Test
	void updateBottleReplacesItsFields() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();
		LocalDate brewed = LocalDate.now().minusMonths(2);

		Bottle updated = service.updateBottle(owner, bottle.getId(), ContainerType.CAN, brewed, null);

		assertThat(updated.getContainerType()).isEqualTo(ContainerType.CAN);
		assertThat(updated.getBrewedDate()).isEqualTo(brewed);
	}

	@Test
	void refusesToUpdateABottleOwnedBySomeoneElse() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();

		assertThatThrownBy(() -> service.updateBottle(UUID.randomUUID(), bottle.getId(), ContainerType.CAN, null, null))
				.isInstanceOf(BottleNotFoundException.class);
	}

	@Test
	void updateBottleSavesThroughTheAggregateRoot() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();
		clearInvocations(entries);

		service.updateBottle(owner, bottle.getId(), ContainerType.CAN, null, null);

		verify(entries).save(any(Entry.class));
	}

	@Test
	void movesTheEntrysUpdatedAtWhenABottleIsAddedUpdatedOrRemoved() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 2, ContainerType.BOTTLE, null, null).getFirst();
		testEntityManager.flush();
		testEntityManager.clear();
		Instant afterAdd = entries.findByUserIdAndBeerId(owner, beerId).orElseThrow().getUpdatedAt();

		service.updateBottle(owner, bottle.getId(), ContainerType.CAN, null, null);
		testEntityManager.flush();
		testEntityManager.clear();
		Instant afterUpdate = entries.findByUserIdAndBeerId(owner, beerId).orElseThrow().getUpdatedAt();

		service.removeBottle(owner, bottle.getId());
		testEntityManager.flush();
		testEntityManager.clear();
		Instant afterRemove = entries.findByUserIdAndBeerId(owner, beerId).orElseThrow().getUpdatedAt();

		assertThat(afterUpdate).isAfterOrEqualTo(afterAdd);
		assertThat(afterRemove).isAfterOrEqualTo(afterUpdate);
		assertThat(afterRemove).isAfter(afterAdd);
	}

	@Test
	void rejectsADomainDateViolationAsInvalidBottle() {
		UUID owner = UUID.randomUUID();
		LocalDate tomorrow = LocalDate.now().plusDays(1);

		assertThatThrownBy(() -> service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, tomorrow, null))
				.isInstanceOf(InvalidBottleException.class)
				.hasMessageContaining("brewedDate");
	}

	@Test
	void rejectsADomainDateViolationOnUpdateAsInvalidBottle() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();
		LocalDate tomorrow = LocalDate.now().plusDays(1);

		assertThatThrownBy(() -> service.updateBottle(owner, bottle.getId(), ContainerType.CAN, tomorrow, null))
				.isInstanceOf(InvalidBottleException.class)
				.hasMessageContaining("brewedDate");
	}

}
