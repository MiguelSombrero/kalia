package fi.kalia.cellar.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.verify;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.BeerSummary;
import fi.kalia.catalog.CatalogApi;
import fi.kalia.catalog.application.CatalogService;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BreweryRepository;
import fi.kalia.cellar.domain.Bottle;
import fi.kalia.cellar.domain.ContainerType;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
import fi.kalia.cellar.domain.InvalidBottleException;
import jakarta.persistence.EntityManagerFactory;
import java.time.Instant;
import java.time.Clock;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.UUID;
import java.util.stream.Collectors;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
@ExtendWith(OutputCaptureExtension.class)
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

	private CatalogApi catalog;

	private CellarService service;

	private UUID beerId;

	private static final Clock CLOCK = Clock.systemUTC();

	private static final LocalDate TODAY = LocalDate.now(CLOCK);

	@BeforeEach
	void setUp() {
		catalog = new CatalogApi(new CatalogService(beers, breweries));
		service = new CellarService(entries, catalog, CLOCK);
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
	void listEntriesReturnsOnlyTheCallersEntriesEachWithItsBottlesAndItsBeer() {
		UUID owner = UUID.randomUUID();
		service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null);
		service.addBottles(owner, beerId, 1, ContainerType.CAN, null, null);
		service.addBottles(UUID.randomUUID(), beerId, 1, ContainerType.KEG, null, null);
		testEntityManager.flush();
		testEntityManager.clear();

		List<EntryView> cellar = service.listEntries(owner);

		assertThat(cellar).hasSize(1);
		assertThat(cellar.getFirst().entry().getBottles()).extracting(Bottle::getContainerType)
				.containsExactly(ContainerType.BOTTLE, ContainerType.CAN);
		assertThat(cellar.getFirst().beer()).isEqualTo(summaryOf(beerId));
	}

	@Test
	void readPublicCellarReturnsTheOwnersEntriesEachWithItsBottlesAndItsBeer() {
		UUID owner = UUID.randomUUID();
		service.addBottles(owner, beerId, 2, ContainerType.BOTTLE, null, null);
		testEntityManager.flush();
		testEntityManager.clear();

		List<EntryView> cellar = service.readPublicCellar(owner);

		assertThat(cellar).hasSize(1);
		assertThat(cellar.getFirst().entry().getBottles()).hasSize(2);
		assertThat(cellar.getFirst().beer()).isEqualTo(summaryOf(beerId));
	}

	@Test
	void readPublicCellarIsEmptyForAnOwnerWithNoCellar() {
		assertThat(service.readPublicCellar(UUID.randomUUID())).isEmpty();
	}

	// ADR-0034: an entry outlives no bottle, so one that slips through empty is
	// a bug to hide from both reads, not a zero-quantity row to show.
	@Test
	void neitherReadReturnsAnEntryWithNoBottles() {
		UUID owner = UUID.randomUUID();
		entries.saveAndFlush(Entry.create(owner, beerId, CLOCK));

		assertThat(service.listEntries(owner)).isEmpty();
		assertThat(service.readPublicCellar(owner)).isEmpty();
	}

	@Test
	void bothReadsLeaveOutAndLogAnEntryWhoseBeerIsNotInTheCatalog(CapturedOutput output) {
		UUID owner = UUID.randomUUID();
		service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null);
		UUID vanishedBeerId = UUID.randomUUID();
		Entry orphan = Entry.create(owner, vanishedBeerId, CLOCK);
		orphan.addBottles(1, ContainerType.CAN, null, null, CLOCK);
		UUID orphanId = entries.saveAndFlush(orphan).getId();
		testEntityManager.clear();

		assertThat(service.listEntries(owner)).extracting(view -> view.beer().id()).containsExactly(beerId);
		assertThat(service.readPublicCellar(owner)).extracting(view -> view.beer().id()).containsExactly(beerId);
		assertThat(output).contains("Left cellar entry " + orphanId + " out: its beer " + vanishedBeerId);
	}

	@Test
	void bothReadsReturnEntriesInBeerNameOrder() {
		UUID owner = UUID.randomUUID();
		// Names starting with different ASCII letters order the same under any
		// collation, so the expectation cannot hinge on how accents are ranked.
		Map<Character, Beer> byInitial = beers.findAll().stream()
				.filter(beer -> beer.getName().matches("(?i)^[a-z].*"))
				.collect(Collectors.toMap(beer -> Character.toLowerCase(beer.getName().charAt(0)), beer -> beer,
						(first, second) -> first, TreeMap::new));
		Beer earlier = byInitial.values().stream().findFirst().orElseThrow();
		Beer later = byInitial.values().stream().skip(1).findFirst().orElseThrow();
		service.addBottles(owner, later.getId(), 1, ContainerType.BOTTLE, null, null);
		service.addBottles(owner, earlier.getId(), 1, ContainerType.BOTTLE, null, null);
		testEntityManager.flush();
		testEntityManager.clear();

		assertThat(service.listEntries(owner)).extracting(view -> view.beer().id())
				.containsExactly(earlier.getId(), later.getId());
		assertThat(service.readPublicCellar(owner)).extracting(view -> view.beer().id())
				.containsExactly(earlier.getId(), later.getId());
	}

	@Test
	void updateBottleReplacesItsFields() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();
		LocalDate brewed = TODAY.minusMonths(2);

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
		LocalDate dayAfterTomorrow = TODAY.plusDays(2);

		assertThatThrownBy(() -> service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, dayAfterTomorrow, null))
				.isInstanceOf(InvalidBottleException.class)
				.hasMessageContaining("brewedDate");
	}

	@Test
	void rejectsADomainDateViolationOnUpdateAsInvalidBottle() {
		UUID owner = UUID.randomUUID();
		Bottle bottle = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, null, null).getFirst();
		LocalDate dayAfterTomorrow = TODAY.plusDays(2);

		assertThatThrownBy(() -> service.updateBottle(owner, bottle.getId(), ContainerType.CAN, dayAfterTomorrow, null))
				.isInstanceOf(InvalidBottleException.class)
				.hasMessageContaining("brewedDate");
	}

	// The one-day tolerance (Bottle.FUTURE_TOLERANCE_DAYS) is exercised at the
	// domain level by BottleTest; this only proves it isn't lost on the way
	// from CellarService through Entry.
	@Test
	void acceptsABrewedDateOfTomorrowThroughTheService() {
		UUID owner = UUID.randomUUID();
		LocalDate tomorrow = TODAY.plusDays(1);

		Bottle accepted = service.addBottles(owner, beerId, 1, ContainerType.BOTTLE, tomorrow, null).getFirst();

		assertThat(accepted.getBrewedDate()).isEqualTo(tomorrow);
	}

	private BeerSummary summaryOf(UUID id) {
		return catalog.getBeerSummaries(List.of(id)).get(id);
	}

}
