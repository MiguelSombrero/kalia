package fi.kalia.cellar.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class BottleTest {

	private static final Entry ENTRY = Entry.create(UUID.randomUUID(), UUID.randomUUID());

	private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-23T12:00:00Z"), ZoneOffset.UTC);

	private static final LocalDate TODAY = LocalDate.now(CLOCK);

	private static final Clock LAST_INSTANT_OF_A_UTC_DAY =
			Clock.fixed(Instant.parse("2026-10-23T23:59:59.999999999Z"), ZoneOffset.UTC);

	private static final Clock FIRST_INSTANT_OF_THE_NEXT_UTC_DAY =
			Clock.fixed(Instant.parse("2026-10-24T00:00:00Z"), ZoneOffset.UTC);

	@Test
	void acceptsABrewedDateOfToday() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, TODAY, null, CLOCK);

		assertThat(bottle.getBrewedDate()).isEqualTo(TODAY);
	}

	// The one-day tolerance is what lets a caller east of UTC record a bottle
	// brewed on their own local today: no IANA timezone is ever more than a
	// day ahead of the server's own UTC clock.
	@Test
	void acceptsABrewedDateOfTomorrow() {
		LocalDate tomorrow = TODAY.plusDays(1);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, tomorrow, null, CLOCK);

		assertThat(bottle.getBrewedDate()).isEqualTo(tomorrow);
	}

	@Test
	void rejectsABrewedDateTwoDaysInTheFuture() {
		LocalDate dayAfterTomorrow = TODAY.plusDays(2);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, dayAfterTomorrow, null, CLOCK))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void theLastInstantBeforeMidnightUtcStillRefusesTheDayAfterTomorrow() {
		LocalDate tomorrow = LocalDate.parse("2026-10-24");

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, tomorrow, null, LAST_INSTANT_OF_A_UTC_DAY);

		assertThat(bottle.getBrewedDate()).isEqualTo(tomorrow);
		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, tomorrow.plusDays(1), null,
				LAST_INSTANT_OF_A_UTC_DAY))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void midnightUtcMovesTheLatestAcceptedBrewedDateOnByADay() {
		LocalDate dayAfter = LocalDate.parse("2026-10-25");

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, dayAfter, null, FIRST_INSTANT_OF_THE_NEXT_UTC_DAY);

		assertThat(bottle.getBrewedDate()).isEqualTo(dayAfter);
		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, dayAfter.plusDays(1), null,
				FIRST_INSTANT_OF_THE_NEXT_UTC_DAY))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateEqualToTheBrewedDate() {
		LocalDate date = TODAY.minusMonths(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, date, date, CLOCK))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void rejectsABestBeforeDateBeforeTheBrewedDate() {
		LocalDate brewed = TODAY.minusMonths(1);
		LocalDate bestBefore = brewed.minusDays(1);

		assertThatThrownBy(() -> Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore, CLOCK))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void acceptsABestBeforeDateAfterTheBrewedDate() {
		LocalDate brewed = TODAY.minusYears(1);
		LocalDate bestBefore = brewed.plusYears(2);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, brewed, bestBefore, CLOCK);

		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void allowsBothDatesToBeUnknown() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, null, CLOCK);

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBrewedDateToBeKnown() {
		LocalDate brewed = TODAY.minusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.KEG, brewed, null, CLOCK);

		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isNull();
	}

	@Test
	void allowsOnlyTheBestBeforeDateToBeKnown() {
		LocalDate bestBefore = TODAY.plusMonths(6);

		Bottle bottle = Bottle.create(ENTRY, ContainerType.CAN, null, bestBefore, CLOCK);

		assertThat(bottle.getBrewedDate()).isNull();
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void rejectsANullContainerType() {
		assertThatThrownBy(() -> Bottle.create(ENTRY, null, null, null, CLOCK))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsANullEntry() {
		assertThatThrownBy(() -> Bottle.create(null, ContainerType.BOTTLE, null, null, CLOCK))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void updateReplacesContainerTypeAndBothDates() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, CLOCK);
		LocalDate brewed = TODAY.minusMonths(3);
		LocalDate bestBefore = brewed.plusYears(1);

		bottle.update(ContainerType.KEG, brewed, bestBefore, CLOCK);

		assertThat(bottle.getContainerType()).isEqualTo(ContainerType.KEG);
		assertThat(bottle.getBrewedDate()).isEqualTo(brewed);
		assertThat(bottle.getBestBeforeDate()).isEqualTo(bestBefore);
	}

	@Test
	void updateEnforcesTheSameDateInvariantsAsCreate() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, CLOCK);
		LocalDate dayAfterTomorrow = TODAY.plusDays(2);

		assertThatThrownBy(() -> bottle.update(ContainerType.BOTTLE, dayAfterTomorrow, null, CLOCK))
				.isInstanceOf(InvalidBottleException.class);
	}

	@Test
	void updateRejectsANullContainerType() {
		Bottle bottle = Bottle.create(ENTRY, ContainerType.BOTTLE, null, null, CLOCK);

		assertThatThrownBy(() -> bottle.update(null, null, null, CLOCK))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
