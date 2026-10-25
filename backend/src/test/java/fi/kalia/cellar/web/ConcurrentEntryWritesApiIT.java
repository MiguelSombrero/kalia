package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.cellar.domain.Entry;
import fi.kalia.cellar.domain.EntryRepository;
import fi.kalia.feed.domain.FeedLine;
import fi.kalia.feed.domain.FeedLineRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * Two writes to one entry, one of them held between its read and its commit
 * while the other runs to completion. Neither may take a committed bottle
 * with it, and the feed may not describe a bottle that was never committed.
 */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ConcurrentEntryWritesApiIT {

	private static final String BEARER = "Bearer entry-race-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@Autowired
	private FeedLineRepository feedLines;

	@MockitoSpyBean
	private EntryRepository entries;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@PersistenceContext
	private EntityManager entityManager;

	private ExecutorService pool;

	private UUID userId;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		pool = Executors.newFixedThreadPool(2);
		userId = UUID.randomUUID();
		beerId = beerRepository.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
		given(jwtDecoder.decode("entry-race-token")).willReturn(TestTokens.user(userId.toString(), "entry-racer"));
	}

	@AfterEach
	void tearDown() {
		pool.shutdownNow();
	}

	@Test
	void anAddCommittedWhileTheLastBottleIsBeingRemovedIsNotDeletedWithTheEntry() throws Exception {
		String originalBottle = addBottles(1).getFirst();
		CountDownLatch removalHasRead = new CountDownLatch(1);
		CountDownLatch addHasCommitted = new CountDownLatch(1);
		AtomicBoolean held = new AtomicBoolean();
		// Holds the removal between loading the entry and deleting it; the
		// delete is replayed on the calling thread's own transaction because
		// Mockito cannot call through to a Spring Data repository proxy.
		doAnswer(invocation -> {
			if (held.compareAndSet(false, true)) {
				removalHasRead.countDown();
				assertThat(addHasCommitted.await(10, TimeUnit.SECONDS)).isTrue();
			}
			Entry entry = invocation.getArgument(0);
			entityManager.remove(entry);
			return null;
		}).when(entries).delete(any(Entry.class));

		Future<Integer> removal = pool.submit(() -> removeBottle(originalBottle));
		assertThat(removalHasRead.await(10, TimeUnit.SECONDS)).isTrue();
		List<String> added = addBottles(2);
		addHasCommitted.countDown();

		assertThat(removal.get(10, TimeUnit.SECONDS)).isEqualTo(204);
		assertThat(persistedBottleIds()).containsExactlyInAnyOrderElementsOf(added);
		assertThat(awaitFeedQuantities(2)).containsExactlyInAnyOrder(1, 2);
	}

	@Test
	void anAddHeldWhileTheLastBottleIsRemovedStartsOverAndIsPersisted() throws Exception {
		String originalBottle = addBottles(1).getFirst();
		CountDownLatch addHasRead = new CountDownLatch(1);
		CountDownLatch removalHasCommitted = new CountDownLatch(1);
		AtomicBoolean held = new AtomicBoolean();
		// Keep this in sync with EntryRepository.findByUserIdAndBeerId's
		// semantics, as ConcurrentAddBottleApiIT does.
		doAnswer(invocation -> {
			Optional<Entry> found = entityManager
					.createQuery("select e from Entry e where e.userId = :userId and e.beerId = :beerId",
							Entry.class)
					.setParameter("userId", userId)
					.setParameter("beerId", beerId)
					.getResultList()
					.stream()
					.findFirst();
			if (held.compareAndSet(false, true)) {
				addHasRead.countDown();
				assertThat(removalHasCommitted.await(10, TimeUnit.SECONDS)).isTrue();
			}
			return found;
		}).when(entries).findByUserIdAndBeerId(eq(userId), eq(beerId));

		Future<List<String>> add = pool.submit(() -> addBottles(2));
		assertThat(addHasRead.await(10, TimeUnit.SECONDS)).isTrue();
		assertThat(removeBottle(originalBottle)).isEqualTo(204);
		removalHasCommitted.countDown();

		List<String> added = add.get(10, TimeUnit.SECONDS);
		assertThat(persistedBottleIds()).containsExactlyInAnyOrderElementsOf(added);
		assertThat(awaitFeedQuantities(2)).containsExactlyInAnyOrder(1, 2);
	}

	@Test
	void anAddThatKeepsLosingTheRaceIsRefusedWith409AndLeavesNothingBehind() throws Exception {
		List<String> original = addBottles(1);
		assertThat(awaitFeedQuantities(1)).containsExactly(1);
		doThrow(new ObjectOptimisticLockingFailureException(Entry.class, UUID.randomUUID()))
				.when(entries).save(any(Entry.class));

		Map<String, Object> request = addRequest(1);
		client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", BEARER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(request)
				.exchange()
				.expectStatus().isEqualTo(409)
				.expectHeader().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON);

		assertThat(persistedBottleIds()).containsExactlyElementsOf(original);
		Thread.sleep(500);
		assertThat(feedLines.findAll().stream().filter(line -> line.getUserId().equals(userId))).hasSize(1);
	}

	private List<String> addBottles(int quantity) {
		String body = client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", BEARER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(addRequest(quantity))
				.exchange()
				.expectStatus().isCreated()
				.expectBody(String.class)
				.returnResult().getResponseBody();
		return JsonPath.read(body, "$[*].id");
	}

	private Map<String, Object> addRequest(int quantity) {
		Map<String, Object> request = new LinkedHashMap<>();
		request.put("beerId", beerId.toString());
		request.put("containerType", "BOTTLE");
		request.put("quantity", quantity);
		return request;
	}

	private int removeBottle(String bottleId) {
		return client.delete().uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", BEARER)
				.exchange()
				.returnResult(Void.class)
				.getStatus()
				.value();
	}

	private List<String> persistedBottleIds() {
		return entries.findWithBottlesByUserId(userId).stream()
				.flatMap(entry -> entry.getBottles().stream())
				.map(bottle -> bottle.getId().toString())
				.toList();
	}

	// The feed consumer is asynchronous and after-commit (ADR-0058): poll for
	// the lines a test expects, then read what is actually there so a stray
	// extra line fails the assertion instead of being waited past.
	private List<Integer> awaitFeedQuantities(int expectedLines) throws InterruptedException {
		long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
		while (feedQuantities().size() < expectedLines && System.nanoTime() < deadline) {
			Thread.sleep(50);
		}
		Thread.sleep(500);
		return feedQuantities();
	}

	private List<Integer> feedQuantities() {
		return feedLines.findAll().stream()
				.filter(line -> line.getUserId().equals(userId))
				.map(FeedLine::getQuantity)
				.toList();
	}

}
