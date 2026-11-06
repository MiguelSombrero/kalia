package fi.kalia.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.SuggestionReviewed;
import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.modulith.events.core.EventSerializer;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.modulith.test.AssertablePublishedEvents;

/**
 * ADR-0102's one event per decision, on the service's real path: a service that skipped
 * {@code save}, or published from the brewery's side as well, could not make this pass.
 */
@ApplicationModuleTest(mode = BootstrapMode.ALL_DEPENDENCIES)
@Import(TestcontainersConfiguration.class)
class SuggestionReviewEventPublishingIT {

	private static final UUID ADMIN = UUID.randomUUID();

	@Autowired
	private SuggestionReviewService service;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private Clock clock;

	@Autowired
	private EventSerializer serializer;

	@Test
	void anApprovalPublishesOneEventWhetherOrNotItsBreweryWasNew(AssertablePublishedEvents events) {
		UUID contributor = UUID.randomUUID();
		UUID plain = beer(brewery("Event Existing Brewery", "APPROVED", null), "Event Plain", contributor);
		UUID withNew = beer(brewery("Event New Brewery", "PENDING", contributor), "Event With New", contributor);
		Instant before = clock.instant();

		service.approve(plain, ADMIN);
		service.approve(withNew, ADMIN);

		List<SuggestionReviewed> published = published(events);
		assertThat(published).extracting(SuggestionReviewed::beerId).containsExactlyInAnyOrder(plain, withNew);
		assertThat(forBeer(published, withNew)).satisfies(event -> {
			assertThat(event.eventId()).isNotNull();
			assertThat(event.contributorId()).isEqualTo(contributor);
			assertThat(event.outcome()).isEqualTo(SuggestionReviewed.Outcome.APPROVED);
			assertThat(event.beerName()).isEqualTo("Event With New");
			assertThat(event.edited()).isFalse();
			assertThat(event.suggestedName()).isNull();
			assertThat(event.reason()).isNull();
			assertThat(event.occurredAt()).isBetween(before, clock.instant());
		});
	}

	@Test
	void aRejectionPublishesOneEventCarryingItsReasonAndEachEventHasItsOwnId(AssertablePublishedEvents events) {
		UUID contributor = UUID.randomUUID();
		UUID brewery = brewery("Event Shared Brewery", "PENDING", contributor);
		UUID first = beer(brewery, "Event Reject One", contributor);
		UUID second = beer(brewery, "Event Reject Two", contributor);

		service.reject(first, ADMIN, RejectionReason.ALREADY_IN_CATALOG);
		service.reject(second, ADMIN, RejectionReason.INAPPROPRIATE);

		List<SuggestionReviewed> published = published(events);
		assertThat(published).hasSize(2);
		assertThat(forBeer(published, first)).satisfies(event -> {
			assertThat(event.outcome()).isEqualTo(SuggestionReviewed.Outcome.REJECTED);
			assertThat(event.reason()).isEqualTo(RejectionReason.ALREADY_IN_CATALOG);
		});
		assertThat(published).extracting(SuggestionReviewed::eventId).doesNotHaveDuplicates();
	}

	@Test
	void anEditedApprovalPublishesOneEventCarryingTheEditedNameTheSuggestedOneAndTheFlag(AssertablePublishedEvents events) {
		UUID contributor = UUID.randomUUID();
		UUID existing = brewery("Event Edit Target", "APPROVED", null);
		UUID edited = beer(brewery("Event Edit New Brewery", "PENDING", contributor), "Event Typo Name", contributor);
		UUID plain = beer(existing, "Event Unedited", contributor);

		service.approveEdited(edited, ADMIN,
				new SuggestionEdit("Event Fixed Name", "Quadrupel", new BigDecimal("10.5"), new BreweryChoice.Existing(existing)));
		service.approveEdited(plain, ADMIN,
				new SuggestionEdit("Event Unedited", "IPA", new BigDecimal("5.5"), new BreweryChoice.Existing(existing)));

		List<SuggestionReviewed> published = published(events);
		assertThat(published).hasSize(2);
		assertThat(forBeer(published, edited)).satisfies(event -> {
			assertThat(event.outcome()).isEqualTo(SuggestionReviewed.Outcome.APPROVED);
			assertThat(event.contributorId()).isEqualTo(contributor);
			assertThat(event.beerName()).isEqualTo("Event Fixed Name");
			assertThat(event.edited()).isTrue();
			assertThat(event.suggestedName()).isEqualTo("Event Typo Name");
			assertThat(event.reason()).isNull();
		});
		assertThat(forBeer(published, plain)).satisfies(event -> {
			assertThat(event.edited()).isFalse();
			assertThat(event.suggestedName()).isNull();
		});
	}

	// The registry stores the event as JSON and replays it on resubmission, so what a consumer is handed
	// again must equal what was published.
	@Test
	void theEventSurvivesTheRegistrysJsonRoundTrip() {
		SuggestionReviewed rejection = new SuggestionReviewed(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID(),
				SuggestionReviewed.Outcome.REJECTED, "Name", false, null, RejectionReason.NOT_A_REAL_BEER,
				Instant.parse("2026-11-05T10:00:00Z"));

		Object stored = serializer.serialize(rejection);

		assertThat(serializer.deserialize(stored, SuggestionReviewed.class)).isEqualTo(rejection);
	}

	private static List<SuggestionReviewed> published(AssertablePublishedEvents events) {
		List<SuggestionReviewed> published = new ArrayList<>();
		events.ofType(SuggestionReviewed.class).forEach(published::add);
		return published;
	}

	private static SuggestionReviewed forBeer(List<SuggestionReviewed> published, UUID beerId) {
		return published.stream().filter(event -> event.beerId().equals(beerId)).findFirst().orElseThrow();
	}

	private UUID brewery(String name, String status, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, source, contributor_id, moderation_status)
				VALUES (?, ?, 'FI', ?, ?, ?) RETURNING id""", UUID.class,
				name, name, contributor == null ? "SEED" : "USER", contributor, status);
	}

	private UUID beer(UUID brewery, String name, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, ?, 'IPA', 5.5, 'USER', ?, 'PENDING', ?) RETURNING id""", UUID.class,
				brewery, name, contributor, Timestamp.from(Instant.now()));
	}

}
