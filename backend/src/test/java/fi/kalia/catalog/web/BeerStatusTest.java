package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalStateException;

import fi.kalia.catalog.domain.ModerationStatus;
import org.junit.jupiter.api.Test;

class BeerStatusTest {

	@Test
	void reportsTheTwoStatesABeerReadCanCarryByName() {
		assertThat(BeerStatus.from(ModerationStatus.APPROVED)).isEqualTo(BeerStatus.APPROVED);
		assertThat(BeerStatus.from(ModerationStatus.PENDING)).isEqualTo(BeerStatus.PENDING);
	}

	@Test
	void refusesAWithdrawnBeerRatherThanReportingIt() {
		assertThatIllegalStateException().isThrownBy(() -> BeerStatus.from(ModerationStatus.REJECTED));
		assertThatIllegalStateException().isThrownBy(() -> BeerStatus.from(ModerationStatus.REMOVED));
	}

}
