package fi.kalia.cellar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class EntryTest {

	private final Entry entry = Entry.create(UUID.randomUUID(), UUID.randomUUID());

	@Test
	void quantityReflectsTheNumberOfBottles() {
		Bottle.create(entry, ContainerType.BOTTLE, null, null);
		Bottle.create(entry, ContainerType.CAN, null, null);

		assertThat(entry.quantity()).isEqualTo(2);
	}

	@Test
	void removingABottleReducesQuantityWithoutAnyStoredCounter() {
		Bottle first = Bottle.create(entry, ContainerType.BOTTLE, null, null);
		Bottle.create(entry, ContainerType.BOTTLE, null, null);

		entry.removeBottle(first);

		assertThat(entry.quantity()).isEqualTo(1);
		assertThat(entry.getBottles()).doesNotContain(first);
	}

	@Test
	void isEmptyBecomesTrueWhenTheLastBottleIsRemoved() {
		Bottle only = Bottle.create(entry, ContainerType.BOTTLE, null, null);
		assertThat(entry.isEmpty()).isFalse();

		entry.removeBottle(only);

		assertThat(entry.isEmpty()).isTrue();
	}

	@Test
	void bottlesWithDifferentDatesStayDistinguishable() {
		LocalDate brewedIn2024 = LocalDate.of(2024, 6, 1);
		LocalDate brewedIn2026 = LocalDate.of(2026, 6, 1);

		Bottle older = Bottle.create(entry, ContainerType.BOTTLE, brewedIn2024, null);
		Bottle newer = Bottle.create(entry, ContainerType.BOTTLE, brewedIn2026, null);

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
		List<Bottle> created = entry.addBottles(3, ContainerType.BOTTLE, null, null);

		assertThat(created).hasSize(3);
		assertThat(entry.quantity()).isEqualTo(3);
		assertThat(entry.getBottles()).containsExactlyInAnyOrderElementsOf(created);
	}

	@Test
	void removingOneBottleFromABulkAddLeavesTheRestIntact() {
		List<Bottle> created = entry.addBottles(3, ContainerType.BOTTLE, null, null);

		entry.removeBottle(created.get(0));

		assertThat(entry.quantity()).isEqualTo(2);
		assertThat(entry.getBottles()).containsExactlyInAnyOrder(created.get(1), created.get(2));
	}

	@Test
	void bulkAddRejectsANonPositiveQuantity() {
		assertThatThrownBy(() -> entry.addBottles(0, ContainerType.BOTTLE, null, null))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsANullUserId() {
		assertThatThrownBy(() -> Entry.create(null, UUID.randomUUID()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullBeerId() {
		assertThatThrownBy(() -> Entry.create(UUID.randomUUID(), null))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
