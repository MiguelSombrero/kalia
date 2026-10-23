package fi.kalia.profile.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.BDDMockito.given;

import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProfileServiceTest {

	@Mock
	private ProfileRepository profiles;

	private ProfileService service;

	@BeforeEach
	void setUp() {
		service = new ProfileService(profiles);
	}

	@Test
	void publicCellarOwnerIdResolvesTheOwnerOfAPublicCellar() {
		UUID userId = UUID.randomUUID();
		Profile profile = Profile.create(userId, "alice");
		profile.changeCellarVisibility(true);
		given(profiles.findByUsernameIgnoringCase("alice")).willReturn(Optional.of(profile));

		assertThat(service.publicCellarOwnerId("alice")).contains(userId);
	}

	// A private cellar and an unknown username must be one answer (ADR-0050).
	@Test
	void publicCellarOwnerIdIsEmptyForAPrivateCellarOrAnUnknownUsername() {
		Profile privateProfile = Profile.create(UUID.randomUUID(), "alice");
		given(profiles.findByUsernameIgnoringCase("alice")).willReturn(Optional.of(privateProfile));
		given(profiles.findByUsernameIgnoringCase("nobody")).willReturn(Optional.empty());

		assertThat(service.publicCellarOwnerId("alice")).isEmpty();
		assertThat(service.publicCellarOwnerId("nobody")).isEmpty();
	}

}
