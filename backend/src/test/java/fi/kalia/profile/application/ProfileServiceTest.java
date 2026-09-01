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

	// A missing row must read as private rather than throwing or defaulting
	// open (ADR-0049) — the case an implementation that assumes the row
	// exists fails.
	@Test
	void aUserWithNoProfileRowReadsAsPrivate() {
		UUID userId = UUID.randomUUID();
		given(profiles.findById(userId)).willReturn(Optional.empty());

		assertThat(service.isCellarPublic(userId)).isFalse();
	}

	@Test
	void aPublicCellarReadsAsPublic() {
		UUID userId = UUID.randomUUID();
		Profile profile = Profile.create(userId, "alice");
		profile.changeCellarVisibility(true);
		given(profiles.findById(userId)).willReturn(Optional.of(profile));

		assertThat(service.isCellarPublic(userId)).isTrue();
	}

}
