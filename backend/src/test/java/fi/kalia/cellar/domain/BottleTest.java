package fi.kalia.cellar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BottleTest {

	private static final Entry ENTRY = Entry.create(UUID.randomUUID(), UUID.randomUUID());

	@Test
	void rejectsABrewedDateInTheFuture() {
		LocalDate tomorrow = LocalDate.now().plusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, tomorrow, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void acceptsABrewedDateOfToday() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, LocalDate.now(), null);

		assertThat(bottle.getBrewedDate()).isEqualTo(LocalDate.now());
	}

	@Test
	void rejectsABestBeforeDateEqualToTheBrewedDate() {
		LocalDate date = LocalDate.now().minusMonths(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, date, date))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsABestBeforeDateBeforeTheBrewedDate() {
		LocalDate brewed = LocalDate.now().minusMonths(1);
		LocalDate bestBefore = brewed.minusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void acceptsABestBeforeDateAfterTheBrewedDate() {
		LocalDate brewed = LocalDate.now().minusYears(1);
		LocalDate bestBefore = brewed.plusYears(2);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore);

		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void allowsBothDatesToBeUnknown() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, null);

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBrewedDateToBeKnown() {
		LocalDate brewed = LocalDate.now().minusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.KEG, brewed, null);

		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBestBeforeDateToBeKnown() {
		LocalDate bestBefore = LocalDate.now().plusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, bestBefore);

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void rejectsANullContainerType() {
		assertThatThrownBy(() -> Bottle.create(ENTRY, null, null, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullEntry() {
		assertThatThrownBy(() -> Bottle.create(null, ContainerType.BOTTLE, null, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
