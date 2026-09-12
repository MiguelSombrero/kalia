package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ConcurrentAddBottleApiIT {

	private static final String BEARER = "Bearer race-user-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@MockitoSpyBean
	private EntryRepository entries;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@PersistenceContext
	private EntityManager entityManager;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		beerId = beerRepository.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
	}

	@Test
	void concurrentFirstAddsForTheSameBeerBothSucceedAgainstOneSharedEntry() throws Exception {
		UUID userId = UUID.randomUUID();
		given(jwtDecoder.decode("race-user-token")).willReturn(TestTokens.user(userId.toString(), "racer"));

		// Holds both requests at "no entry yet" until both have read it, so
		// both go on to insert concurrently; the retry's own re-read skips the
		// barrier once both parties have already passed through it once, or
		// it would wait forever for a party that never comes.
		CyclicBarrier bothSawNoEntry = new CyclicBarrier(2);
		AtomicInteger reads = new AtomicInteger();
		// Mockito cannot callRealMethod() on a Spring Data repository (a JDK
		// proxy over an interface, no concrete method to call through to);
		// running the same query directly against the calling thread's own
		// (transaction-bound) EntityManager stands in for the real call. Keep
		// this in sync with EntryRepository.findByUserIdAndBeerId's semantics.
		doAnswer(invocation -> {
			if (reads.getAndIncrement() < bothSawNoEntry.getParties()) {
				bothSawNoEntry.await(5, TimeUnit.SECONDS);
			}
			return entityManager
					.createQuery("select e from Entry e where e.userId = :userId and e.beerId = :beerId",
							Entry.class)
					.setParameter("userId", userId)
					.setParameter("beerId", beerId)
					.getResultList()
					.stream()
					.findFirst();
		}).when(entries).findByUserIdAndBeerId(eq(userId), eq(beerId));

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<String> first = pool.submit(addBottle("BOTTLE"));
			Future<String> second = pool.submit(addBottle("CAN"));

			String firstBody = first.get(10, TimeUnit.SECONDS);
			String secondBody = second.get(10, TimeUnit.SECONDS);

			List<String> bottleIds = Stream.of(firstBody, secondBody)
					.map(body -> (String) JsonPath.<List<Object>>read(body, "$[*].id").get(0))
					.toList();
			assertThat(bottleIds).doesNotHaveDuplicates();

			List<Entry> ownedEntries = entries.findWithBottlesByUserId(userId);
			assertThat(ownedEntries).hasSize(1);
			assertThat(ownedEntries.getFirst().quantity()).isEqualTo(2);
		} finally {
			pool.shutdownNow();
		}
	}

	private Callable<String> addBottle(String containerType) {
		return () -> {
			Map<String, Object> request = new LinkedHashMap<>();
			request.put("beerId", beerId.toString());
			request.put("containerType", containerType);
			return client.post().uri("/api/v1/cellar/bottles")
					.header("Authorization", BEARER)
					.contentType(MediaType.APPLICATION_JSON)
					.body(request)
					.exchange()
					.expectStatus().isCreated()
					.expectBody(String.class)
					.returnResult().getResponseBody();
		};
	}

}
