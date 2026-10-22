package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.BeerRepository;
import fi.kalia.catalog.domain.BreweryRepository;
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
import java.util.concurrent.atomic.AtomicInteger;
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
import org.springframework.test.web.servlet.client.EntityExchangeResult;
import org.springframework.test.web.servlet.client.RestTestClient;

@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ConcurrentAddBeerApiIT {

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoSpyBean
	private BeerRepository beers;

	@MockitoSpyBean
	private BreweryRepository breweries;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@PersistenceContext
	private EntityManager entityManager;

	@Test
	void twoConcurrentAddsOfOneBeerCreateOneRowAndRefuseTheOtherWithItsId() throws Exception {
		given(jwtDecoder.decode(anyString()))
				.willReturn(TestTokens.user(UUID.randomUUID().toString(), "racer"));
		UUID breweryId = jdbc.queryForObject(
				"SELECT id FROM catalog.brewery WHERE name = 'Brouwerij Westvleteren'", UUID.class);
		String name = "Race " + UUID.randomUUID().toString().substring(0, 8);

		// Holds both requests at "no such beer yet" until both have looked, so
		// both go on to insert and only the unique index can stop the second;
		// the retry's own look skips the barrier, or it would wait forever.
		CyclicBarrier bothSawNoBeer = new CyclicBarrier(2);
		AtomicInteger looks = new AtomicInteger();
		// Mockito cannot callRealMethod() on a Spring Data repository (a JDK
		// proxy over an interface); the same query against the calling thread's
		// transaction-bound EntityManager stands in for it. Keep this in sync
		// with BeerRepository.findIdByBreweryIdAndSameName.
		doAnswer(invocation -> {
			if (looks.getAndIncrement() < bothSawNoBeer.getParties()) {
				bothSawNoBeer.await(5, TimeUnit.SECONDS);
			}
			return entityManager.createNativeQuery("""
					SELECT id FROM catalog.beer
					WHERE brewery_id = :breweryId AND catalog.fold_name(name) = catalog.fold_name(:name)""",
					UUID.class)
					.setParameter("breweryId", invocation.getArgument(0))
					.setParameter("name", invocation.getArgument(1))
					.getResultStream()
					.findFirst();
		}).when(beers).findIdByBreweryIdAndSameName(any(), any());

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<EntityExchangeResult<String>> first = pool.submit(addBeer(breweryId, name));
			Future<EntityExchangeResult<String>> second = pool.submit(addBeer(breweryId, name.toUpperCase()));
			List<EntityExchangeResult<String>> results = List.of(first.get(10, TimeUnit.SECONDS),
					second.get(10, TimeUnit.SECONDS));

			assertThat(results).extracting(result -> result.getStatus().value()).containsExactlyInAnyOrder(201, 409);
			String created = results.stream().filter(result -> result.getStatus().value() == 201)
					.findFirst().orElseThrow().getResponseBody();
			String refused = results.stream().filter(result -> result.getStatus().value() == 409)
					.findFirst().orElseThrow().getResponseBody();
			assertThat((String) JsonPath.read(refused, "$.existingBeerId"))
					.isEqualTo(JsonPath.read(created, "$.id"));
			assertThat(jdbc.queryForObject(
					"SELECT count(*) FROM catalog.beer WHERE brewery_id = ? AND catalog.fold_name(name) = catalog.fold_name(?)",
					Long.class, breweryId, name)).isEqualTo(1);
		} finally {
			pool.shutdownNow();
		}
	}

	@Test
	void twoConcurrentAddsOfOneNewBreweryCreateOneRowAndRefuseTheOtherWithItsId() throws Exception {
		given(jwtDecoder.decode(anyString()))
				.willReturn(TestTokens.user(UUID.randomUUID().toString(), "racer"));
		String breweryName = "Race Brewery " + UUID.randomUUID().toString().substring(0, 8);

		// The same barrier as the beer race above, on the brewery's own check.
		CyclicBarrier bothSawNoBrewery = new CyclicBarrier(2);
		AtomicInteger looks = new AtomicInteger();
		doAnswer(invocation -> {
			if (looks.getAndIncrement() < bothSawNoBrewery.getParties()) {
				bothSawNoBrewery.await(5, TimeUnit.SECONDS);
			}
			return entityManager.createNativeQuery("""
					SELECT id FROM catalog.brewery
					WHERE catalog.fold_name(name) = catalog.fold_name(:name) AND lower(country) = lower(:country)""",
					UUID.class)
					.setParameter("name", invocation.getArgument(0))
					.setParameter("country", invocation.getArgument(1))
					.getResultStream()
					.findFirst();
		}).when(breweries).findIdBySameNameAndCountry(any(), any());

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<EntityExchangeResult<String>> first = pool.submit(
					post(Map.of("name", "First", "style", "Quadrupel", "abv", 10.0,
							"newBrewery", Map.of("name", breweryName, "country", "Finland"))));
			Future<EntityExchangeResult<String>> second = pool.submit(
					post(Map.of("name", "Second", "style", "Quadrupel", "abv", 10.0,
							"newBrewery", Map.of("name", breweryName.toLowerCase(), "country", "Finland"))));
			List<EntityExchangeResult<String>> results = List.of(first.get(10, TimeUnit.SECONDS),
					second.get(10, TimeUnit.SECONDS));

			assertThat(results).extracting(result -> result.getStatus().value()).containsExactlyInAnyOrder(201, 409);
			String created = results.stream().filter(result -> result.getStatus().value() == 201)
					.findFirst().orElseThrow().getResponseBody();
			String refused = results.stream().filter(result -> result.getStatus().value() == 409)
					.findFirst().orElseThrow().getResponseBody();
			assertThat((String) JsonPath.read(refused, "$.existingBreweryId"))
					.isEqualTo(JsonPath.read(created, "$.brewery.id"));
			assertThat(jdbc.queryForObject(
					"SELECT count(*) FROM catalog.brewery WHERE catalog.fold_name(name) = catalog.fold_name(?)",
					Long.class, breweryName)).isEqualTo(1);
		} finally {
			pool.shutdownNow();
		}
	}

	private Callable<EntityExchangeResult<String>> addBeer(UUID breweryId, String name) {
		return post(Map.of("name", name, "style", "Quadrupel", "abv", 10.0, "breweryId", breweryId.toString()));
	}

	private Callable<EntityExchangeResult<String>> post(Map<String, Object> body) {
		return () -> client.post().uri("/api/v1/beers")
				.header("Authorization", "Bearer racer-token")
				.contentType(MediaType.APPLICATION_JSON)
				.body(body)
				.exchange()
				.expectBody(String.class)
				.returnResult();
	}

}
