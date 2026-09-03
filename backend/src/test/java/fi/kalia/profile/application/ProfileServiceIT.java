package fi.kalia.profile.application;

import static org.assertj.core.api.Assertions.assertThat;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class ProfileServiceIT {

	@Autowired
	private ProfileRepository profiles;

	private ProfileService service;

	@BeforeEach
	void setUp() {
		service = new ProfileService(profiles);
	}

	@Test
	void aSecondSignInReusesTheSameLazilyCreatedProfile() {
		UUID userId = UUID.randomUUID();

		Profile first = service.currentProfile(userId, "alice");
		Profile second = service.currentProfile(userId, "alice");

		assertThat(second.getId()).isEqualTo(first.getId());
		assertThat(profiles.findAllById(List.of(userId))).hasSize(1);
	}

	// Confirmed to fail against an implementation that refreshes the
	// username on every call instead of only at creation (ADR-0049).
	@Test
	void theUsernameDoesNotChangeWhenALaterTokenCarriesADifferentOne() {
		UUID userId = UUID.randomUUID();

		service.currentProfile(userId, "alice");
		Profile onASecondToken = service.currentProfile(userId, "alice-renamed");

		assertThat(onASecondToken.getUsername()).isEqualTo("alice");
	}

	@Test
	void aUserWithNoProfileRowReadsAsPrivate() {
		assertThat(service.isCellarPublic(UUID.randomUUID())).isFalse();
	}

	@Test
	void changingVisibilityCreatesTheProfileIfNoneExistsYet() {
		UUID userId = UUID.randomUUID();

		service.changeCellarVisibility(userId, "alice", true);

		assertThat(profiles.findById(userId).orElseThrow().isCellarPublic()).isTrue();
	}

	// A Keycloak sub change (ADR-0033) can leave two profile rows sharing one
	// username; publicCellarOwnerId must resolve to the newest — the one the
	// current token's sub points at — not throw on the pair.
	@Test
	void publicCellarOwnerIdResolvesToTheNewestProfileWhenAUsernameIsDuplicated() throws InterruptedException {
		UUID staleId = UUID.randomUUID();
		UUID currentId = UUID.randomUUID();
		profiles.saveAndFlush(makePublic(Profile.create(staleId, "alice")));
		// Distinct VM creation timestamps: @CreationTimestamp is Instant.now()
		// at persist, and the ordering under test needs the two to differ.
		Thread.sleep(5);
		profiles.saveAndFlush(makePublic(Profile.create(currentId, "alice")));

		assertThat(service.publicCellarOwnerId("alice")).contains(currentId);
	}

	private static Profile makePublic(Profile profile) {
		profile.changeCellarVisibility(true);
		return profile;
	}

}
