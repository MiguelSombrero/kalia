package fi.kalia.profile.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.BDDMockito.given;
import static org.mockito.Mockito.doAnswer;

import fi.kalia.TestTokens;
import fi.kalia.TestcontainersConfiguration;
import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.Optional;
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
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.client.RestTestClient;

// ADR-0057's revisit trigger fired: profile's own get-or-create races when
// two reads for the same brand-new user land close together, which happens
// in practice whenever more than one page reads the caller's profile on the
// same visit, not only under a contrived race.
@Import(TestcontainersConfiguration.class)
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureRestTestClient
class ProfileServiceConcurrencyIT {

	@Autowired
	private RestTestClient client;

	@MockitoSpyBean
	private ProfileRepository profiles;

	@MockitoBean
	private JwtDecoder jwtDecoder;

	@PersistenceContext
	private EntityManager entityManager;

	@Test
	void concurrentFirstReadsForANewUserBothSucceedAgainstOneSharedProfile() throws Exception {
		UUID userId = UUID.randomUUID();
		given(jwtDecoder.decode("race-user-token")).willReturn(TestTokens.user(userId.toString(), "racer"));

		// Holds both requests at "no row yet" until both have read it, so both
		// go on to insert concurrently; the retry's own re-read skips the
		// barrier once both parties have already passed through it once, or
		// it would wait forever for a party that never comes.
		CyclicBarrier bothSawNoProfile = new CyclicBarrier(2);
		AtomicInteger reads = new AtomicInteger();
		// Mockito cannot callRealMethod() on a Spring Data repository (a JDK
		// proxy over an interface, no concrete method to call through to);
		// reading directly against the calling thread's own (transaction-bound)
		// EntityManager stands in for the real call.
		doAnswer(invocation -> {
			if (reads.getAndIncrement() < bothSawNoProfile.getParties()) {
				bothSawNoProfile.await(5, TimeUnit.SECONDS);
			}
			return Optional.ofNullable(entityManager.find(Profile.class, userId));
		}).when(profiles).findById(eq(userId));

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<String> first = pool.submit(readProfile());
			Future<String> second = pool.submit(readProfile());

			String firstBody = first.get(10, TimeUnit.SECONDS);
			String secondBody = second.get(10, TimeUnit.SECONDS);

			assertThat(firstBody).isEqualTo(secondBody);
			assertThat(profiles.findById(userId)).isPresent();
		} finally {
			pool.shutdownNow();
		}
	}

	private Callable<String> readProfile() {
		return () -> client.get().uri("/api/v1/profile")
				.header("Authorization", "Bearer race-user-token")
				.exchange()
				.expectStatus().isOk()
				.expectBody(String.class)
				.returnResult().getResponseBody();
	}

}
