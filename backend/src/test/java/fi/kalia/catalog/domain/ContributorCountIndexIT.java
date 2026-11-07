package fi.kalia.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;

// Asserts the plan, not the counts: SuggestionReviewServiceIT covers what the
// queue shows. The SQL is captured from Hibernate so the plan is of the
// statement the admin queue really issues, and it is judged against the migrated
// catalog, Wikidata import included, where a full scan reads every approved beer.
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import({TestcontainersConfiguration.class, BeerSearchIndexIT.SqlCaptureConfiguration.class})
class ContributorCountIndexIT {

	private static final int REJECTED_BEERS = 200;

	private static final int CONTRIBUTORS = 50;

	@Autowired
	private BeerRepository beers;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private BeerSearchIndexIT.CapturedSql capturedSql;

	@BeforeEach
	void rejectedBeersAccumulateAmongTheCatalog() {
		jdbc.update("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status)
				SELECT (SELECT id FROM catalog.brewery LIMIT 1), 'Rejected ' || n, 'Lager', 5.0, 'USER',
				       md5('contributor ' || (n % ?))::uuid, 'REJECTED'
				FROM generate_series(1, ?) AS n""", CONTRIBUTORS, REJECTED_BEERS);
		jdbc.execute("ANALYZE catalog.beer");
	}

	@Test
	void catalogIsSeededToTheScaleTheIndexIsJudgedAt() {
		assertThat(jdbc.queryForObject("SELECT count(*) FROM catalog.beer WHERE moderation_status = 'APPROVED'",
				Long.class)).isGreaterThanOrEqualTo(10_000);
	}

	@Test
	void rejectedCountsAreReadFromAnIndexNotAScanOfTheCatalog() {
		List<UUID> contributors = List.of(UUID.randomUUID(), UUID.randomUUID(), UUID.randomUUID());
		List<String> statements = capturedSql.of(() -> beers.countPendingAndRejectedByContributor(contributors));
		assertThat(statements).hasSize(1);
		assertThat(SqlPlans.planFor(jdbc, statements.getFirst())).contains("beer_pending_contributor_idx",
				"beer_rejected_contributor_idx");
	}

}
