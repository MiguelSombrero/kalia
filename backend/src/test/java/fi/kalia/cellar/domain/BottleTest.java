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
		LocalDate today = LocalDate.now();
		LocalDate tomorrow = today.plusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, tomorrow, null, today))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void acceptsABrewedDateOfToday() {
		LocalDate today = LocalDate.now();

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, today, null, today);

		assertThat(bottle.getBrewedDate()).isEqualTo(today);
	}

	// The boundary is judged against the caller-supplied today, not this
	// method's own clock: a date years from the real run date is accepted
	// when it equals the supplied today, and rejected the day after it.
	@Test
	void acceptsABrewedDateEqualToTheSuppliedToday() {
		LocalDate today = LocalDate.now().plusYears(3);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, today, null, today);

		assertThat(bottle.getBrewedDate()).isEqualTo(today);
	}

	@Test
	void rejectsABrewedDateOneDayPastTheSuppliedToday() {
		LocalDate today = LocalDate.now().plusYears(3);
		LocalDate dayAfter = today.plusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, dayAfter, null, today))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateEqualToTheBrewedDate() {
		LocalDate today = LocalDate.now();
		LocalDate date = today.minusMonths(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, date, date, today))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateBeforeTheBrewedDate() {
		LocalDate today = LocalDate.now();
		LocalDate brewed = today.minusMonths(1);
		LocalDate bestBefore = brewed.minusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore, today))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void acceptsABestBeforeDateAfterTheBrewedDate() {
		LocalDate today = LocalDate.now();
		LocalDate brewed = today.minusYears(1);
		LocalDate bestBefore = brewed.plusYears(2);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore, today);

		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void allowsBothDatesToBeUnknown() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, null, LocalDate.now());

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBrewedDateToBeKnown() {
		LocalDate today = LocalDate.now();
		LocalDate brewed = today.minusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.KEG, brewed, null, today);

		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBestBeforeDateToBeKnown() {
		LocalDate bestBefore = LocalDate.now().plusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, bestBefore, LocalDate.now());

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void rejectsANullContainerType() {
		assertThatThrownBy(() -> Bottle.create(ENTRY, null, null, null, LocalDate.now()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullEntry() {
		assertThatThrownBy(() -> Bottle.create(null, ContainerType.BOTTLE, null, null, LocalDate.now()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullToday() {
		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void updateReplacesContainerTypeAndBothDates() {
		LocalDate today = LocalDate.now();
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, today);
		LocalDate brewed = today.minusMonths(3);
		LocalDate bestBefore = brewed.plusYears(1);

		bottle.update(ContainerType.KEG, brewed, bestBefore, today);

		assertThat(bottle.getContainerType()).isEqualTo(ContainerType.KEG);
		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void updateEnforcesTheSameDateInvariantsAsCreate() {
		LocalDate today = LocalDate.now();
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, today);
		LocalDate tomorrow = today.plusDays(1);

		assertThatThrownBy(() -> bottle.update(ContainerType.BOTTLE, tomorrow, null, today))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void updateRejectsANullContainerType() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, LocalDate.now());

		assertThatThrownBy(() -> bottle.update(null, null, null, LocalDate.now()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void updateRejectsANullToday() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, LocalDate.now());

		assertThatThrownBy(() -> bottle.update(ContainerType.BOTTLE, null, null, null))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
