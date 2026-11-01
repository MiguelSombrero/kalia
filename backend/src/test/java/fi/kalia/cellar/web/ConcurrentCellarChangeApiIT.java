package fi.kalia.cellar.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Beer;
import fi.kalia.catalog.domain.BeerRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Pattern;
import org.hibernate.resource.jdbc.spi.StatementInspector;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.hibernate.autoconfigure.HibernatePropertiesCustomizer;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureRestTestClient;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.client.RestTestClient;

/**
 * A request held between two of its statements while another request changes the cellar. Each test
 * holds the request at the same point of its own read, so it exercises the gap the code leaves
 * between its statements, not any one query shape.
 */
@Import({TestcontainersConfiguration.class, ConcurrentCellarChangeApiIT.StatementGateConfiguration.class})
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ConcurrentCellarChangeApiIT {

	private static final String OWNER = "Bearer cellar-change-token";

	@Autowired
	private RestTestClient client;

	@Autowired
	private BeerRepository beerRepository;

	@Autowired
	private StatementGate gate;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	private ExecutorService pool;

	private String ownerName;

	private UUID beerId;

	@BeforeEach
	void setUp() {
		pool = Executors.newSingleThreadExecutor();
		ownerName = "owner-" + UUID.randomUUID();
		beerId = beerRepository.findAll().stream().findFirst().map(Beer::getId).orElseThrow();
		given(jwtDecoder.decode("cellar-change-token"))
				.willReturn(TestTokens.user(UUID.randomUUID().toString(), ownerName));
	}

	@AfterEach
	void tearDown() {
		gate.release();
		pool.shutdownNow();
	}

	@Test
	void aBottleRemovedTwiceAtOnceAnswersOneNoContentAndOneNotFound() throws Exception {
		List<String> bottles = addBottles(2);
		gate.holdBeforeStatement(2, "cellar\\.(entry|bottle)");

		Future<Integer> late = pool.submit(() -> removeBottle(bottles.getFirst()));
		assertThat(gate.awaitHeld()).isTrue();
		int early = removeBottle(bottles.getFirst());
		gate.release();

		assertThat(early).isEqualTo(204);
		assertThat(late.get(10, TimeUnit.SECONDS)).isEqualTo(404);
		assertThat(removeBottle(bottles.getLast())).isEqualTo(204);
	}

	@Test
	void aBottleUpdatedAfterAnotherRequestRemovedItAnswersNotFound() throws Exception {
		List<String> bottles = addBottles(2);
		gate.holdBeforeStatement(2, "cellar\\.(entry|bottle)");

		Future<Integer> late = pool.submit(() -> updateBottle(bottles.getFirst()));
		assertThat(gate.awaitHeld()).isTrue();
		assertThat(removeBottle(bottles.getFirst())).isEqualTo(204);
		gate.release();

		assertThat(late.get(10, TimeUnit.SECONDS)).isEqualTo(404);
	}

	@Test
	void aPublicCellarReadWhileTheLastBottleIsRemovedAgreesWithItself() throws Exception {
		String only = addBottles(1).getFirst();
		setVisibility(true);
		gate.holdBeforeStatement(2, "cellar\\.bottle");

		Future<String> read = pool.submit(this::readPublicCellar);
		assertThat(gate.awaitHeld()).isTrue();
		assertThat(removeBottle(only)).isEqualTo(204);
		gate.release();

		String body = read.get(10, TimeUnit.SECONDS);
		assertThat((int) JsonPath.read(body, "$.content.length()")).isEqualTo(1);
		assertThat((int) JsonPath.read(body, "$.content[0].quantity")).isEqualTo(1);
		assertThat((int) JsonPath.read(body, "$.content[0].bottles.length()")).isEqualTo(1);
		assertThat((int) JsonPath.read(body, "$.totalBottles")).isEqualTo(1);
		assertThat((int) JsonPath.read(readPublicCellar(), "$.content.length()")).isZero();
	}

	private List<String> addBottles(int quantity) {
		String body = client.post().uri("/api/v1/cellar/bottles")
				.header("Authorization", OWNER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("beerId", beerId.toString(), "containerType", "BOTTLE", "quantity", quantity))
				.exchange()
				.expectStatus().isCreated()
				.expectBody(String.class)
				.returnResult().getResponseBody();
		return JsonPath.read(body, "$[*].id");
	}

	private int removeBottle(String bottleId) {
		return client.delete().uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", OWNER)
				.exchange()
				.returnResult(Void.class)
				.getStatus()
				.value();
	}

	private int updateBottle(String bottleId) {
		return client.method(HttpMethod.PATCH).uri("/api/v1/cellar/bottles/{id}", bottleId)
				.header("Authorization", OWNER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("containerType", "CAN"))
				.exchange()
				.returnResult(Void.class)
				.getStatus()
				.value();
	}

	private void setVisibility(boolean cellarPublic) {
		client.method(HttpMethod.PATCH).uri("/api/v1/profile/visibility")
				.header("Authorization", OWNER)
				.contentType(MediaType.APPLICATION_JSON)
				.body(Map.of("cellarPublic", cellarPublic))
				.exchange()
				.expectStatus().isOk();
	}

	private String readPublicCellar() {
		return client.get().uri("/api/v1/cellars/{username}", ownerName)
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

	/** Holds one statement of one request, whichever thread issues it, until the test lets it go. */
	static class StatementGate implements StatementInspector {

		private volatile Pattern pattern;

		private volatile int holdBefore;

		private final AtomicInteger seen = new AtomicInteger();

		private volatile CountDownLatch held = new CountDownLatch(1);

		private volatile CountDownLatch released = new CountDownLatch(1);

		void holdBeforeStatement(int nth, String regex) {
			seen.set(0);
			held = new CountDownLatch(1);
			released = new CountDownLatch(1);
			holdBefore = nth;
			pattern = Pattern.compile(regex);
		}

		boolean awaitHeld() throws InterruptedException {
			return held.await(10, TimeUnit.SECONDS);
		}

		void release() {
			pattern = null;
			released.countDown();
		}

		@Override
		public String inspect(String sql) {
			Pattern armed = pattern;
			if (armed != null && armed.matcher(sql).find() && seen.incrementAndGet() == holdBefore) {
				held.countDown();
				try {
					released.await(10, TimeUnit.SECONDS);
				} catch (InterruptedException e) {
					Thread.currentThread().interrupt();
				}
			}
			return sql;
		}

	}

	@TestConfiguration
	static class StatementGateConfiguration {

		@Bean
		StatementGate statementGate() {
			return new StatementGate();
		}

		@Bean
		HibernatePropertiesCustomizer statementGateCustomizer(StatementGate gate) {
			return properties -> properties.put("hibernate.session_factory.statement_inspector", gate);
		}

	}

}
