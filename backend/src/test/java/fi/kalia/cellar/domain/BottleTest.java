package fi.kalia.cellar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BottleTest {

	private static final Entry ENTRY = Entry.create(UUID.randomUUID(), UUID.randomUUID());

	private static final LocalDate TODAY = LocalDate.now();

	@Test
	void acceptsABrewedDateOfToday() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, TODAY, null);

		assertThat(bottle.getBrewedDate()).isEqualTo(TODAY);
	}

	// The one-day tolerance is what lets a caller east of UTC record a bottle
	// brewed on their own local today (see the task's Why): no IANA timezone
	// is ever more than a day ahead of the server's own UTC clock.
	@Test
	void acceptsABrewedDateOfTomorrow() {
		LocalDate tomorrow = TODAY.plusDays(1);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, tomorrow, null);

		assertThat(bottle.getBrewedDate()).isEqualTo(tomorrow);
	}

	@Test
	void rejectsABrewedDateTwoDaysInTheFuture() {
		LocalDate dayAfterTomorrow = TODAY.plusDays(2);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, dayAfterTomorrow, null))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateEqualToTheBrewedDate() {
		LocalDate date = TODAY.minusMonths(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, date, date))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateBeforeTheBrewedDate() {
		LocalDate brewed = TODAY.minusMonths(1);
		LocalDate bestBefore = brewed.minusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void acceptsABestBeforeDateAfterTheBrewedDate() {
		LocalDate brewed = TODAY.minusYears(1);
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
		LocalDate brewed = TODAY.minusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.KEG, brewed, null);

		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBestBeforeDateToBeKnown() {
		LocalDate bestBefore = TODAY.plusMonths(6);

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

	@Test
	void updateReplacesContainerTypeAndBothDates() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null);
		LocalDate brewed = TODAY.minusMonths(3);
		LocalDate bestBefore = brewed.plusYears(1);

		bottle.update(ContainerType.KEG, brewed, bestBefore);

		assertThat(bottle.getContainerType()).isEqualTo(ContainerType.KEG);
		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void updateEnforcesTheSameDateInvariantsAsCreate() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null);
		LocalDate dayAfterTomorrow = TODAY.plusDays(2);

		assertThatThrownBy(() -> bottle.update(ContainerType.BOTTLE, dayAfterTomorrow, null))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void updateRejectsANullContainerType() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null);

		assertThatThrownBy(() -> bottle.update(null, null, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
