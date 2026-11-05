package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.SuggestionReviewed;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Collection;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

class BeerTest {

	private static final Instant NOW = Instant.parse("2020-02-03T04:05:06Z");

	private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

	private final Brewery brewery = Brewery.create("Test Brewery", "FI", null, CLOCK);

	@Test
	void aCatalogBeerIsCreatedAtTheClocksInstant() {
		Beer beer = Beer.create(brewery, "Test IPA", "IPA", new BigDecimal("6.5"), CLOCK);

		assertThat(beer.getCreatedAt()).isEqualTo(NOW);
	}

	@Test
	void aContributedBeerIsCreatedAtTheClocksInstant() {
		Beer beer = Beer.addedBy(UUID.randomUUID(), brewery, "Test IPA", "IPA", new BigDecimal("6.5"), CLOCK);

		assertThat(beer.getCreatedAt()).isEqualTo(NOW);
	}

	@Test
	void approvingASuggestionRegistersOneEventAtTheClocksInstant() {
		UUID contributor = UUID.randomUUID();
		Beer beer = suggestion(contributor);
		Instant later = Instant.parse("2020-02-04T00:00:00Z");

		Instant decidedAt = beer.approve(Clock.fixed(later, ZoneOffset.UTC));

		assertThat(decidedAt).isEqualTo(later);
		assertThat(beer.getModerationStatus()).isEqualTo(ModerationStatus.APPROVED);
		assertThat(events(beer)).singleElement().isInstanceOfSatisfying(SuggestionReviewed.class, event -> {
			assertThat(event.eventId()).isNotNull();
			assertThat(event.contributorId()).isEqualTo(contributor);
			assertThat(event.outcome()).isEqualTo(SuggestionReviewed.Outcome.APPROVED);
			assertThat(event.beerName()).isEqualTo("Test IPA");
			assertThat(event.edited()).isFalse();
			assertThat(event.suggestedName()).isNull();
			assertThat(event.reason()).isNull();
			assertThat(event.occurredAt()).isEqualTo(later);
		});
	}

	@Test
	void rejectingASuggestionCarriesItsReason() {
		Beer beer = suggestion(UUID.randomUUID());

		beer.reject(RejectionReason.NOT_A_REAL_BEER, CLOCK);

		assertThat(beer.getModerationStatus()).isEqualTo(ModerationStatus.REJECTED);
		assertThat(events(beer)).singleElement().isInstanceOfSatisfying(SuggestionReviewed.class, event -> {
			assertThat(event.outcome()).isEqualTo(SuggestionReviewed.Outcome.REJECTED);
			assertThat(event.reason()).isEqualTo(RejectionReason.NOT_A_REAL_BEER);
		});
	}

	@Test
	void aBeerNobodySuggestedOrAlreadyDecidedCannotBeDecided() {
		Beer imported = Beer.create(brewery, "Imported", "IPA", new BigDecimal("5.0"), CLOCK);
		Beer decided = suggestion(UUID.randomUUID());
		decided.approve(CLOCK);

		assertThatThrownBy(() -> imported.approve(CLOCK)).isInstanceOf(IllegalStateException.class);
		assertThatThrownBy(() -> decided.reject(RejectionReason.INAPPROPRIATE, CLOCK))
				.isInstanceOf(IllegalStateException.class);
	}

	private Beer suggestion(UUID contributor) {
		return Beer.addedBy(contributor, brewery, "Test IPA", "IPA", new BigDecimal("6.5"), CLOCK);
	}

	private static Collection<Object> events(Beer beer) {
		return ReflectionTestUtils.invokeMethod(beer, "domainEvents");
	}

}
