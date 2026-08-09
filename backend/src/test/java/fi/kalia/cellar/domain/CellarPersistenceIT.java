package fi.kalia.cellar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
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
	private BottleRepository bottles;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void persistsAndReloadsAnEntryWithItsBottles() {
		Entry entry = entries.save(Entry.create(UUID.randomUUID(), UUID.randomUUID()));
		Bottle.create(entry, ContainerType.BOTTLE, LocalDate.now().minusMonths(6), null);
		Bottle.create(entry, ContainerType.CAN, LocalDate.now().minusYears(1), LocalDate.now().plusMonths(6));
		entries.save(entry);

		Entry reloaded = entries.findById(entry.getId()).orElseThrow();

		assertThat(reloaded.quantity()).isEqualTo(2);
	}

	@Test
	void populatesCreatedAtAndUpdatedAtOnCreate() {
		// saveAndFlush: @CreationTimestamp/@UpdateTimestamp generate at flush
		// time, not when persist() is first called.
		Entry entry = entries.saveAndFlush(Entry.create(UUID.randomUUID(), UUID.randomUUID()));
		Bottle bottle = bottles.saveAndFlush(Bottle.create(entry, ContainerType.KEG, null, null));

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

	@Test
	void removingABottleDeletesItsRowRatherThanLeavingItOrphaned() {
		Entry entry = entries.save(Entry.create(UUID.randomUUID(), UUID.randomUUID()));
		// Saved through bottles, not entries: see CellarService.addBottle.
		Bottle bottle = bottles.saveAndFlush(Bottle.create(entry, ContainerType.BOTTLE, null, null));

		entry.removeBottle(bottle);
		entries.flush();

		assertThat(bottles.existsById(bottle.getId())).isFalse();
	}

	@Test
	void theDatabaseRejectsAContainerTypeOutsideTheAllowedSet() {
		Entry entry = entries.saveAndFlush(Entry.create(UUID.randomUUID(), UUID.randomUUID()));

		assertThatThrownBy(() -> jdbcTemplate.update(
				"INSERT INTO cellar.bottle (entry_id, container_type) VALUES (?, ?)",
				entry.getId(), "GROWLER"))
				.isInstanceOf(DataAccessException.class);
	}

}
