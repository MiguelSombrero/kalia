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
	void rejectsABrewedDateInTheFuture() {
		LocalDate tomorrow = TODAY.plusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, tomorrow, null, TODAY))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void acceptsABrewedDateOfToday() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, TODAY, null, TODAY);

		assertThat(bottle.getBrewedDate()).isEqualTo(TODAY);
	}

	// The boundary is judged against the caller-supplied today, not this
	// method's own clock: a date years from the real run date is accepted
	// when it equals the supplied today, and rejected the day after it.
	@Test
	void acceptsABrewedDateEqualToTheSuppliedToday() {
		LocalDate suppliedToday = TODAY.plusYears(3);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, suppliedToday, null, suppliedToday);

		assertThat(bottle.getBrewedDate()).isEqualTo(suppliedToday);
	}

	@Test
	void rejectsABrewedDateOneDayPastTheSuppliedToday() {
		LocalDate suppliedToday = TODAY.plusYears(3);
		LocalDate dayAfter = suppliedToday.plusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, dayAfter, null, suppliedToday))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateEqualToTheBrewedDate() {
		LocalDate date = TODAY.minusMonths(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, date, date, TODAY))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateBeforeTheBrewedDate() {
		LocalDate brewed = TODAY.minusMonths(1);
		LocalDate bestBefore = brewed.minusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore, TODAY))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void acceptsABestBeforeDateAfterTheBrewedDate() {
		LocalDate brewed = TODAY.minusYears(1);
		LocalDate bestBefore = brewed.plusYears(2);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore, TODAY);

		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void allowsBothDatesToBeUnknown() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, null, TODAY);

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBrewedDateToBeKnown() {
		LocalDate brewed = TODAY.minusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.KEG, brewed, null, TODAY);

		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBestBeforeDateToBeKnown() {
		LocalDate bestBefore = TODAY.plusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, bestBefore, TODAY);

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void rejectsANullContainerType() {
		assertThatThrownBy(() -> Bottle.create(ENTRY, null, null, null, TODAY))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullEntry() {
		assertThatThrownBy(() -> Bottle.create(null, ContainerType.BOTTLE, null, null, TODAY))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullToday() {
		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void updateReplacesContainerTypeAndBothDates() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, TODAY);
		LocalDate brewed = TODAY.minusMonths(3);
		LocalDate bestBefore = brewed.plusYears(1);

		bottle.update(ContainerType.KEG, brewed, bestBefore, TODAY);

		assertThat(bottle.getContainerType()).isEqualTo(ContainerType.KEG);
		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void updateEnforcesTheSameDateInvariantsAsCreate() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, TODAY);
		LocalDate tomorrow = TODAY.plusDays(1);

		assertThatThrownBy(() -> bottle.update(ContainerType.BOTTLE, tomorrow, null, TODAY))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void updateRejectsANullContainerType() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, TODAY);

		assertThatThrownBy(() -> bottle.update(null, null, null, TODAY))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void updateRejectsANullToday() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, TODAY);

		assertThatThrownBy(() -> bottle.update(ContainerType.BOTTLE, null, null, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
