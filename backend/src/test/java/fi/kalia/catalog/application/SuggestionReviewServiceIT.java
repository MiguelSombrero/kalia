package fi.kalia.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import jakarta.persistence.EntityManagerFactory;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.TestPropertySource;

/** What a page of the review queue costs, which an HTTP test cannot see. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
@TestPropertySource(properties = "spring.jpa.properties.hibernate.generate_statistics=true")
class SuggestionReviewServiceIT {

	@Autowired
	private SuggestionReviewService service;

	@Autowired
	private JdbcTemplate jdbc;

	@Autowired
	private EntityManagerFactory entityManagerFactory;

	@BeforeEach
	void setUp() {
		jdbc.update("UPDATE catalog.beer SET moderation_status = 'REMOVED' WHERE moderation_status = 'PENDING'");
	}

	// The queue's contributors are all different, so a count or a name read once per row
	// would make a page of six cost more than a page of two.
	@Test
	void aPageCostsTheSameNumberOfStatementsHoweverManySuggestionsItHolds() {
		UUID brewery = jdbc.queryForObject("SELECT id FROM catalog.brewery LIMIT 1", UUID.class);
		for (int i = 0; i < 6; i++) {
			UUID contributor = UUID.randomUUID();
			jdbc.update("INSERT INTO profile.profile (id, username) VALUES (?, ?)", contributor, "queue-" + contributor);
			jdbc.update("""
					INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
					VALUES (?, ?, 'IPA', 5.0, 'USER', ?, 'PENDING', ?)""",
					brewery, "Queued " + contributor, contributor, java.sql.Timestamp.from(Instant.now()));
		}
		Statistics statistics = entityManagerFactory.unwrap(SessionFactory.class).getStatistics();

		statistics.clear();
		assertThat(service.pendingSuggestions(PageRequest.of(0, 2)).getContent()).hasSize(2);
		long forTwo = statistics.getPrepareStatementCount();

		statistics.clear();
		assertThat(service.pendingSuggestions(PageRequest.of(0, 6)).getContent()).hasSize(6);
		long forSix = statistics.getPrepareStatementCount();

		assertThat(forSix).isEqualTo(forTwo);
	}

}
