package fi.kalia.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/**
 * Do not widen this to a full context: bootstrapping profile alone is what
 * proves its ADR-0057 retry does not ride on another module's configuration.
 */
@ApplicationModuleTest
@Import(TestcontainersConfiguration.class)
class ProfileServiceModuleIT {

	@Autowired
	private ProfileService service;

	@MockitoSpyBean
	private ProfileRepository profiles;

	@PersistenceContext
	private EntityManager entityManager;

	@Test
	void concurrentFirstSignInsForANewUserBothSucceedAgainstOneSharedProfile() throws Exception {
		UUID userId = UUID.randomUUID();
		CyclicBarrier bothSawNoProfile = new CyclicBarrier(2);
		AtomicInteger reads = new AtomicInteger();
		// See ProfileServiceConcurrencyIT for why this reads through the
		// EntityManager instead of calling the real repository method.
		doAnswer(invocation -> {
			if (reads.getAndIncrement() < bothSawNoProfile.getParties()) {
				bothSawNoProfile.await(5, TimeUnit.SECONDS);
			}
			return Optional.ofNullable(entityManager.find(Profile.class, userId));
		}).when(profiles).findById(eq(userId));

		ExecutorService pool = Executors.newFixedThreadPool(2);
		try {
			Future<Profile> first = pool.submit(() -> service.currentProfile(userId, "racer"));
			Future<Profile> second = pool.submit(() -> service.currentProfile(userId, "racer"));

			assertThat(first.get(10, TimeUnit.SECONDS).getId()).isEqualTo(userId);
			assertThat(second.get(10, TimeUnit.SECONDS).getId()).isEqualTo(userId);
			assertThat(reads.get()).isGreaterThan(bothSawNoProfile.getParties());
		} finally {
			pool.shutdownNow();
		}
	}

	@Test
	void publicUsernamesRunsReadOnly() {
		AtomicBoolean readOnly = new AtomicBoolean();
		doAnswer(invocation -> {
			readOnly.set(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
			return List.of();
		}).when(profiles).findAllById(any());

		service.publicUsernames(List.of(UUID.randomUUID()));

		assertThat(readOnly).isTrue();
	}

	@Test
	void publicCellarOwnerIdRunsReadOnly() {
		AtomicBoolean readOnly = new AtomicBoolean();
		doAnswer(invocation -> {
			readOnly.set(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
			return Optional.empty();
		}).when(profiles).findByUsernameIgnoringCase(anyString());

		service.publicCellarOwnerId("alice");

		assertThat(readOnly).isTrue();
	}

}
