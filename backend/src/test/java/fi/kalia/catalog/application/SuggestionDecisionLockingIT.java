package fi.kalia.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.RejectionReason;
import fi.kalia.catalog.domain.Review;
import fi.kalia.catalog.domain.ReviewRepository;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionTemplate;

/**
 * What a decision's transaction and row locks guarantee (ADR-0102), which a request-level test
 * cannot hold still long enough to see.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest
class SuggestionDecisionLockingIT {

	private static final UUID ADMIN = UUID.randomUUID();

	@Autowired
	private SuggestionReviewService service;

	@Autowired
	private TransactionTemplate transactions;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoSpyBean
	private ReviewRepository reviews;

	@Test
	void aFailureAfterTheBeersUpdateLeavesTheBeerAndItsBreweryPending() {
		UUID contributor = UUID.randomUUID();
		UUID brewery = brewery("Atomic Brewery", contributor);
		UUID beer = beer(brewery, "Atomic Beer", contributor);
		doThrow(new IllegalStateException("the record could not be written")).when(reviews).save(any(Review.class));

		assertThatThrownBy(() -> service.approve(beer, ADMIN)).hasMessageContaining("could not be written");

		assertThat(status("beer", beer)).isEqualTo("PENDING");
		assertThat(status("brewery", brewery)).isEqualTo("PENDING");
	}

	// The first rejection is held open, as a slow transaction would be, while the second starts. Without
	// the brewery's lock the second counts the first's beer as still pending, and the brewery is left
	// PENDING with nobody waiting on it.
	@Test
	void twoSuggestionsSharingAPendingBreweryRejectedTogetherLeaveItRejected() throws Exception {
		UUID contributor = UUID.randomUUID();
		UUID brewery = brewery("Stranded Brewery", contributor);
		UUID first = beer(brewery, "Stranded One", contributor);
		UUID second = beer(brewery, "Stranded Two", contributor);
		CountDownLatch firstDecided = new CountDownLatch(1);
		CountDownLatch secondStarted = new CountDownLatch(1);
		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<?> slow = pool.submit(() -> transactions.executeWithoutResult(tx -> {
				service.reject(first, ADMIN, RejectionReason.INCORRECT_DETAILS);
				firstDecided.countDown();
				await(secondStarted);
				sleep(1500);
			}));
			assertThat(firstDecided.await(30, TimeUnit.SECONDS)).isTrue();
			Future<?> other = pool.submit(() -> {
				secondStarted.countDown();
				service.reject(second, ADMIN, RejectionReason.INCORRECT_DETAILS);
			});

			slow.get(60, TimeUnit.SECONDS);
			other.get(60, TimeUnit.SECONDS);
		}
		finally {
			pool.shutdownNow();
		}

		assertThat(status("beer", first)).isEqualTo("REJECTED");
		assertThat(status("beer", second)).isEqualTo("REJECTED");
		assertThat(status("brewery", brewery)).isEqualTo("REJECTED");
	}

	private static void await(CountDownLatch latch) {
		try {
			assertThat(latch.await(30, TimeUnit.SECONDS)).isTrue();
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	private static void sleep(long millis) {
		try {
			Thread.sleep(millis);
		}
		catch (InterruptedException e) {
			Thread.currentThread().interrupt();
		}
	}

	private String status(String table, UUID id) {
		return jdbc.queryForObject("SELECT moderation_status FROM catalog." + table + " WHERE id = ?", String.class, id);
	}

	private UUID brewery(String name, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, source, contributor_id, moderation_status)
				VALUES (?, ?, 'FI', 'USER', ?, 'PENDING') RETURNING id""", UUID.class, name, name, contributor);
	}

	private UUID beer(UUID brewery, String name, UUID contributor) {
		return jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, ?, 'IPA', 5.5, 'USER', ?, 'PENDING', ?) RETURNING id""", UUID.class,
				brewery, name, contributor, Timestamp.from(Instant.now()));
	}

}
