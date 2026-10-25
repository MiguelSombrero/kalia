package fi.kalia.cellar.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doAnswer;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.cellar.domain.EntryRepository;
import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Import;
import org.springframework.modulith.test.ApplicationModuleTest;
import org.springframework.modulith.test.ApplicationModuleTest.BootstrapMode;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@ApplicationModuleTest(mode = BootstrapMode.ALL_DEPENDENCIES)
@Import(TestcontainersConfiguration.class)
class CellarServiceModuleIT {

	@Autowired
	private CellarService service;

	@MockitoSpyBean
	private EntryRepository entries;

	@Autowired
	private ProfileRepository profiles;

	private final AtomicBoolean readOnly = new AtomicBoolean();

	@BeforeEach
	void recordWhetherTheLoadRunsReadOnly() {
		doAnswer(invocation -> {
			readOnly.set(TransactionSynchronizationManager.isCurrentTransactionReadOnly());
			return List.of();
		}).when(entries).findWithBottlesByUserId(any());
	}

	@Test
	void listEntriesRunsReadOnly() {
		service.listEntries(UUID.randomUUID());

		assertThat(readOnly).isTrue();
	}

	@Test
	void readPublicCellarRunsReadOnly() {
		UUID owner = UUID.randomUUID();
		Profile profile = Profile.create(owner, "owner-" + owner);
		profile.changeCellarVisibility(true);
		profiles.save(profile);

		service.readPublicCellar(profile.getUsername());

		assertThat(readOnly).isTrue();
	}

}
