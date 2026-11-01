package fi.kalia.cellar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.cellar.BottleAdded;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.RepeatedTest;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class EntryTest {

	private static final Clock CLOCK = Clock.systemUTC();

	private final Entry entry = Entry.create(UUID.randomUUID(), UUID.randomUUID(), CLOCK);

	@Test
	void quantityReflectsTheNumberOfBottles() {
		Bottle.create(entry, ContainerType.BOTTLE, null, null, CLOCK);
		Bottle.create(entry, ContainerType.CAN, null, null, CLOCK);

		assertThat(entry.quantity()).isEqualTo(2);
	}

	@Test
	void removingABottleReducesQuantityWithoutAnyStoredCounter() {
		Bottle first = Bottle.create(entry, ContainerType.BOTTLE, null, null, CLOCK);
		Bottle.create(entry, ContainerType.BOTTLE, null, null, CLOCK);

		entry.removeBottle(first, CLOCK);

		assertThat(entry.quantity()).isEqualTo(1);
		assertThat(entry.getBottles()).doesNotContain(first);
	}

	@Test
	void isEmptyBecomesTrueWhenTheLastBottleIsRemoved() {
		Bottle only = Bottle.create(entry, ContainerType.BOTTLE, null, null, CLOCK);
		assertThat(entry.isEmpty()).isFalse();

		entry.removeBottle(only, CLOCK);

		assertThat(entry.isEmpty()).isTrue();
	}

	@Test
	void bottlesWithDifferentDatesStayDistinguishable() {
		LocalDate brewedIn2024 = LocalDate.of(2024, 6, 1);
		LocalDate brewedIn2026 = LocalDate.of(2026, 6, 1);

		Bottle older = Bottle.create(entry, ContainerType.BOTTLE, brewedIn2024, null, CLOCK);
		Bottle newer = Bottle.create(entry, ContainerType.BOTTLE, brewedIn2026, null, CLOCK);

		assertThat(entry.getBottles()).containsExactlyInAnyOrder(older, newer);
		assertThat(entry.getBottles())
				.filteredOn(b -> b.getBrewedDate().equals(brewedIn2024))
				.containsExactly(older);
		assertThat(entry.getBottles())
				.filteredOn(b -> b.getBrewedDate().equals(brewedIn2026))
				.containsExactly(newer);
	}

	@Test
	void bulkAddCreatesThatManyIndependentRows() {
		List<Bottle> created = entry.addBottles(3, ContainerType.BOTTLE, null, null, CLOCK);

		assertThat(created).hasSize(3);
		assertThat(entry.quantity()).isEqualTo(3);
		assertThat(entry.getBottles()).containsExactlyInAnyOrderElementsOf(created);
	}

	@Test
	void removingOneBottleFromABulkAddLeavesTheRestIntact() {
		List<Bottle> created = entry.addBottles(3, ContainerType.BOTTLE, null, null, CLOCK);

		entry.removeBottle(created.get(0), CLOCK);

		assertThat(entry.quantity()).isEqualTo(2);
		assertThat(entry.getBottles()).containsExactlyInAnyOrder(created.get(1), created.get(2));
	}

	@RepeatedTest(5)
	void bottlesAddedTogetherUnderOneInstantReadBackInInsertionOrder() {
		Clock fixed = Clock.fixed(Instant.parse("2026-11-01T10:00:00Z"), ZoneOffset.UTC);
		Entry fresh = Entry.create(UUID.randomUUID(), UUID.randomUUID(), fixed);

		List<Bottle> created = fresh.addBottles(3, ContainerType.BOTTLE, null, null, fixed);

		assertThat(fresh.getBottles()).containsExactlyElementsOf(created);
		assertThat(fresh.lastBottles(3)).containsExactlyElementsOf(created);
	}

	@Test
	void bulkAddRejectsANonPositiveQuantity() {
		assertThatThrownBy(() -> entry.addBottles(0, ContainerType.BOTTLE, null, null, CLOCK))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void bottleAddedCarriesTheClocksInstantAndEveryTimestampReadsTheClock() {
		Instant added = Instant.parse("2026-10-23T12:00:00Z");
		Instant later = Instant.parse("2026-10-24T08:30:00Z");
		Entry fresh = Entry.create(UUID.randomUUID(), UUID.randomUUID(), Clock.fixed(added, ZoneOffset.UTC));

		List<Bottle> created = fresh.addBottles(2, ContainerType.CAN, null, null, Clock.fixed(added, ZoneOffset.UTC));

		assertThat(ReflectionTestUtils.<Collection<Object>>invokeMethod(fresh, "domainEvents")).singleElement().isInstanceOfSatisfying(BottleAdded.class,
				event -> assertThat(event.occurredAt()).isEqualTo(added));
		assertThat(fresh.getCreatedAt()).isEqualTo(added);
		assertThat(created).allSatisfy(bottle -> assertThat(bottle.getCreatedAt()).isEqualTo(added));

		UUID updatedId = UUID.randomUUID();
		ReflectionTestUtils.setField(created.getLast(), "id", updatedId);
		fresh.removeBottle(created.getFirst(), Clock.fixed(later, ZoneOffset.UTC));
		fresh.updateBottle(fresh.findBottle(updatedId).orElseThrow(), ContainerType.BOTTLE, null, null,
				Clock.fixed(later, ZoneOffset.UTC));

		assertThat(fresh.getUpdatedAt()).isEqualTo(later);
		assertThat(created.getLast().getUpdatedAt()).isEqualTo(later);
		assertThat(fresh.getCreatedAt()).isEqualTo(added);
	}

	@Test
	void rejectsANullUserId() {
		assertThatThrownBy(() -> Entry.create(null, UUID.randomUUID(), CLOCK))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullBeerId() {
		assertThatThrownBy(() -> Entry.create(UUID.randomUUID(), null, CLOCK))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
