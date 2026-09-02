package fi.kalia.cellar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class CellarPersistenceIT {

	@Autowired
	private EntryRepository entries;

	@Autowired
	private TestEntityManager testEntityManager;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void persistsAndReloadsAnEntryWithItsBottles() {
		Entry entry = entries.save(Entry.create(UUID.randomUUID(), UUID.randomUUID()));
		entry.addBottles(1, ContainerType.BOTTLE, LocalDate.now().minusMonths(6), null);
		entry.addBottles(1, ContainerType.CAN, LocalDate.now().minusYears(1), LocalDate.now().plusMonths(6));
		entries.saveAndFlush(entry);
		testEntityManager.clear();

		Entry reloaded = entries.findById(entry.getId()).orElseThrow();

		assertThat(reloaded.quantity()).isEqualTo(2);
	}

	@Test
	void populatesCreatedAtAndUpdatedAtOnCreate() {
		Entry entry = entries.saveAndFlush(Entry.create(UUID.randomUUID(), UUID.randomUUID()));
		entry.addBottles(1, ContainerType.KEG, null, null);
		Entry saved = entries.saveAndFlush(entry);
		Bottle bottle = saved.getBottles().getFirst();

		assertThat(entry.getCreatedAt()).isNotNull();
		assertThat(entry.getUpdatedAt()).isNotNull();
		assertThat(bottle.getCreatedAt()).isNotNull();
		assertThat(bottle.getUpdatedAt()).isNotNull();
	}

	@Test
	void anEntryIsUniquePerUserAndBeer() {
		UUID userId = UUID.randomUUID();
		UUID beerId = UUID.randomUUID();
		entries.saveAndFlush(Entry.create(userId, beerId));

		assertThatThrownBy(() -> entries.saveAndFlush(Entry.create(userId, beerId)))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// ADR-0034 evidence: removing a bottle deletes its row rather than changing
	// a stored counter. Exercised through the aggregate now that the row's
	// lifecycle belongs to Entry (ADR-0052).
	@Test
	void removingABottleDeletesItsRowRatherThanLeavingItOrphaned() {
		UUID userId = UUID.randomUUID();
		Entry entry = entries.save(Entry.create(userId, UUID.randomUUID()));
		entry.addBottles(1, ContainerType.BOTTLE, null, null);
		entries.saveAndFlush(entry);
		testEntityManager.clear();

		Entry reloaded = entries.findByIdAndUserId(entry.getId(), userId).orElseThrow();
		Bottle persisted = reloaded.getBottles().getFirst();
		UUID bottleId = persisted.getId();
		reloaded.removeBottle(persisted);
		entries.saveAndFlush(reloaded);

		assertThat(reloaded.quantity()).isZero();
		assertThat(entries.findByBottleIdAndUserId(bottleId, userId)).isEmpty();
	}

	@Test
	void theDatabaseRejectsAContainerTypeOutsideTheAllowedSet() {
		Entry entry = entries.saveAndFlush(Entry.create(UUID.randomUUID(), UUID.randomUUID()));

		assertThatThrownBy(() -> jdbcTemplate.update(
				"INSERT INTO cellar.bottle (entry_id, container_type) VALUES (?, ?)",
				entry.getId(), "GROWLER"))
				.isInstanceOf(DataAccessException.class);
	}

	@Test
	void findByIdAndUserIdFindsNothingForAnotherUsersEntry() {
		UUID owner = UUID.randomUUID();
		Entry entry = entries.saveAndFlush(Entry.create(owner, UUID.randomUUID()));

		assertThat(entries.findByIdAndUserId(entry.getId(), owner)).isPresent();
		assertThat(entries.findByIdAndUserId(entry.getId(), UUID.randomUUID())).isEmpty();
	}

	@Test
	void findSummariesByUserIdReportsDerivedQuantityWithoutLoadingBottles() {
		UUID userId = UUID.randomUUID();
		Entry withTwoBottles = entries.save(Entry.create(userId, UUID.randomUUID()));
		withTwoBottles.addBottles(2, ContainerType.BOTTLE, null, null);
		Entry empty = entries.save(Entry.create(userId, UUID.randomUUID()));
		entries.saveAllAndFlush(List.of(withTwoBottles, empty));
		entries.save(Entry.create(UUID.randomUUID(), UUID.randomUUID())); // another user

		List<EntrySummary> summaries = entries.findSummariesByUserId(userId);

		assertThat(summaries).hasSize(2);
		assertThat(summaries)
				.filteredOn(s -> s.getId().equals(withTwoBottles.getId()))
				.extracting(EntrySummary::getQuantity)
				.containsExactly(2L);
		assertThat(summaries)
				.filteredOn(s -> s.getId().equals(empty.getId()))
				.extracting(EntrySummary::getQuantity)
				.containsExactly(0L);
	}

	@Test
	void anEntrysBottlesLoadOrderedByCreatedAt() {
		UUID userId = UUID.randomUUID();
		Entry entry = entries.save(Entry.create(userId, UUID.randomUUID()));
		entry.addBottles(1, ContainerType.BOTTLE, null, null);
		entries.saveAndFlush(entry);
		entry.addBottles(1, ContainerType.CAN, null, null);
		entries.saveAndFlush(entry);
		Entry other = entries.save(Entry.create(UUID.randomUUID(), UUID.randomUUID()));
		other.addBottles(1, ContainerType.KEG, null, null);
		entries.saveAndFlush(other);
		testEntityManager.clear();

		List<Bottle> bottles = entries.findByIdAndUserId(entry.getId(), userId).orElseThrow().getBottles();

		assertThat(bottles).extracting(Bottle::getContainerType)
				.containsExactly(ContainerType.BOTTLE, ContainerType.CAN);
	}

}
