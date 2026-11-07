package fi.kalia.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;

import com.jayway.jsonpath.JsonPath;
import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.catalog.domain.Brewery;
import fi.kalia.catalog.domain.BreweryRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
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

/** An admin's edit racing a contributor's add on the unique index, which only the edit can lose. */
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ConcurrentSuggestionEditApiIT {

	@Autowired
	private RestTestClient client;

	@Autowired
	private JdbcTemplate jdbc;

	@MockitoSpyBean
	private BreweryRepository breweries;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@PersistenceContext
	private EntityManager entityManager;

	@Test
	void aContributorsAddCommittingBetweenAnEditsDuplicateReadAndItsFlushAnswersTheEditTheDocumentedConflict()
			throws Exception {
		UUID contributorId = UUID.randomUUID();
		given(jwtDecoder.decode("admin-token")).willReturn(TestTokens.admin(UUID.randomUUID().toString(), "admin"));
		given(jwtDecoder.decode("racer-token")).willReturn(TestTokens.user(UUID.randomUUID().toString(), "racer"));
		String name = "Race Edit " + UUID.randomUUID().toString().substring(0, 8);
		UUID typo = jdbc.queryForObject("""
				INSERT INTO catalog.brewery (name, name_sort_key, country_code, source, contributor_id, moderation_status)
				VALUES ('Typo Race', 'typo race', 'FI', 'USER', ?, 'PENDING') RETURNING id""", UUID.class, contributorId);
		UUID suggestion = jdbc.queryForObject("""
				INSERT INTO catalog.beer (brewery_id, name, style, abv, source, contributor_id, moderation_status, created_at)
				VALUES (?, 'Racing Suggestion', 'IPA', 5.0, 'USER', ?, 'PENDING', ?) RETURNING id""", UUID.class,
				typo, contributorId, Timestamp.from(Instant.now()));

		// The edit's read of "no such brewery yet" returns, and then holds the edit until the
		// contributor's add has committed, so the edit's flush is what meets the unique index. Only
		// the first look, the edit's, waits; the retry's own look must not.
		CountDownLatch editHasRead = new CountDownLatch(1);
		CountDownLatch addHasCommitted = new CountDownLatch(1);
		AtomicInteger looks = new AtomicInteger();
		// Mockito cannot callRealMethod() on a Spring Data repository (a JDK proxy over an
		// interface); the same query against the calling thread's transaction-bound EntityManager
		// stands in for it. Keep this in sync with BreweryRepository.findBySameNameAndCountryCode.
		doAnswer(invocation -> {
			Object found = entityManager.createNativeQuery("""
					SELECT * FROM catalog.brewery
					WHERE catalog.fold_name(name) = catalog.fold_name(:name) AND country_code = :countryCode
					AND moderation_status IN ('PENDING', 'APPROVED')""",
					Brewery.class)
					.setParameter("name", invocation.getArgument(0))
					.setParameter("countryCode", invocation.getArgument(1))
					.getResultStream()
					.findFirst();
			if (looks.getAndIncrement() == 0) {
				editHasRead.countDown();
				assertThat(addHasCommitted.await(10, TimeUnit.SECONDS)).isTrue();
			}
			return found;
		}).when(breweries).findBySameNameAndCountryCode(any(), any());

		ExecutorService pool = Executors.newFixedThreadPool(1);
		try {
			Future<EntityExchangeResult<String>> edit = pool.submit(() -> client.post()
					.uri("/api/v1/admin/suggestions/" + suggestion + "/edited-approval")
					.header("Authorization", "Bearer admin-token")
					.contentType(MediaType.APPLICATION_JSON)
					.body(Map.of("name", "Racing Suggestion", "style", "IPA", "abv", 5.0,
							"newBrewery", Map.of("name", name, "countryCode", "FI")))
					.exchange().expectBody(String.class).returnResult());
			assertThat(editHasRead.await(10, TimeUnit.SECONDS)).isTrue();

			String added = client.post().uri("/api/v1/beers")
					.header("Authorization", "Bearer racer-token")
					.contentType(MediaType.APPLICATION_JSON)
					.body(Map.of("name", "Racer Beer", "style", "IPA", "abv", 5.0,
							"newBrewery", Map.of("name", name.toUpperCase(), "countryCode", "FI")))
					.exchange().expectStatus().isCreated().expectBody(String.class).returnResult().getResponseBody();
			addHasCommitted.countDown();

			EntityExchangeResult<String> edited = edit.get(10, TimeUnit.SECONDS);
			assertThat(edited.getStatus().value()).isEqualTo(409);
			assertThat((String) JsonPath.read(edited.getResponseBody(), "$.existingBreweryId"))
					.isEqualTo(JsonPath.read(added, "$.brewery.id"));
			assertThat(jdbc.queryForObject(
					"SELECT count(*) FROM catalog.brewery WHERE catalog.fold_name(name) = catalog.fold_name(?)",
					Long.class, name)).isEqualTo(1);
			assertThat(jdbc.queryForObject("SELECT moderation_status FROM catalog.beer WHERE id = ?", String.class,
					suggestion)).isEqualTo("PENDING");
		} finally {
			addHasCommitted.countDown();
			pool.shutdownNow();
		}
	}

}
