package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;

import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.cellar.application.CellarService;
import fi.kalia.cellar.domain.CellarCounts;
import fi.kalia.cellar.domain.EntryRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ConcurrentCellarLimitApiIT {

	private static final int LIMIT = CellarService.MAX_BOTTLES;

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoSpyBean
	private EntryRepository entries;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@PersistenceContext
	private EntityManager entityManager;

	@Test
	void twoAddsOfDifferentBeersAtOneBottleBelowTheLimitNeverTakeTheCellarPastIt() throws Exception {
		UUID userId = UUID.randomUUID();
		given(jwtDecoder.decode("cap-race-token")).willReturn(TestTokens.user(userId.toString(), "cap-racer"));
		List<UUID> beers = beerRepository.findAll().stream().map(Beer::getId).limit(2).toList();
		CellarSeeding.bottles(jdbc, userId, beers.get(0), LIMIT - 1);

		// Holds each add after it read the count, so without the lock both would
		// have read LIMIT - 1 and gone on to insert. With it, the second add cannot reach
		// the count until the first has committed, so the first one's wait runs out
		// instead; the timeout lets that run on rather than failing it.
		CyclicBarrier bothReadTheCount = new CyclicBarrier(2);
		// Mockito cannot callRealMethod() on a Spring Data repository (a JDK proxy over
		// an interface); the same query on the calling thread's own EntityManager stands
		// in. Keep it in sync with EntryRepository.countOf.
		doAnswer(invocation -> {
			CellarCounts counted = entityManager.createQuery("""
					select new fi.kalia.cellar.domain.CellarCounts(count(distinct b.entry.beerId), count(b)) from Bottle b
					where b.entry.userId = :userId""", CellarCounts.class)
					.setParameter("userId", userId)
					.getSingleResult();
			try {
				bothReadTheCount.await(2, TimeUnit.SECONDS);
			} catch (TimeoutException | java.util.concurrent.BrokenBarrierException e) {
				// the other add was held back by the lock
			}
			return counted;
		}).when(entries).countOf(eq(userId));

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<Integer> first = pool.submit(addOneOf(beers.get(0)));
			Future<Integer> second = pool.submit(addOneOf(beers.get(1)));

			List<Integer> statuses = List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));

			assertThat(statuses).containsExactlyInAnyOrder(201, 422);
			assertThat(CellarSeeding.bottlesHeld(jdbc, userId)).isEqualTo(LIMIT);
		} finally {
			pool.shutdownNow();
		}
	}

	private Callable<Integer> addOneOf(UUID beerId) {
		return () -> client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", "Bearer cap-race-token")
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("beerId", beerId.toString(), "containerType", "BOTTLE"))
				.exchange()
				.returnResult(String.class)
				.getStatus().value();
	}

}
