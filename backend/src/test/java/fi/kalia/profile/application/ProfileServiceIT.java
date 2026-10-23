package fi.kalia.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
import org.springframework.dao.DataIntegrityViolationException;

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

	@Test
	void aSecondProfileWithAnExistingUsernameIsRefusedByTheDatabase() {
		profiles.saveAndFlush(Profile.create(UUID.randomUUID(), "alice"));

		assertThatThrownBy(() -> profiles.saveAndFlush(Profile.create(UUID.randomUUID(), "alice")))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	@Test
	void aUsernameDifferingOnlyInCaseIsRefusedByTheDatabase() {
		profiles.saveAndFlush(Profile.create(UUID.randomUUID(), "alice"));

		assertThatThrownBy(() -> profiles.saveAndFlush(Profile.create(UUID.randomUUID(), "Alice")))
				.isInstanceOf(DataIntegrityViolationException.class);
	}

	// Kalia never learns that a Keycloak account was deleted, so "the old
	// account is gone" and "the old account is still here" are the same row.
	@Test
	void aUsernameWhoseAccountNoLongerExistsIsNotGivenToANewAccount() {
		UUID departedId = UUID.randomUUID();
		profiles.saveAndFlush(makePublic(Profile.create(departedId, "alice")));
		UUID newcomerId = UUID.randomUUID();

		assertThatThrownBy(() -> service.currentProfile(newcomerId, "alice"))
				.isInstanceOf(UsernameTakenException.class);
		assertThatThrownBy(() -> service.changeCellarVisibility(newcomerId, "ALICE", true))
				.isInstanceOf(UsernameTakenException.class);

		assertThat(profiles.findById(newcomerId)).isEmpty();
		assertThat(service.publicCellarOwnerId("alice")).contains(departedId);
	}

	// The public route echoes the requested spelling back as the owner's
	// username, which the frontend's owner check compares to the stored one.
	@Test
	void publicCellarOwnerIdMatchesOnlyTheExactSpelling() {
		profiles.saveAndFlush(makePublic(Profile.create(UUID.randomUUID(), "alice")));

		assertThat(service.publicCellarOwnerId("Alice")).isEmpty();
	}

	private static Profile makePublic(Profile profile) {
		profile.changeCellarVisibility(true);
		return profile;
	}

}
