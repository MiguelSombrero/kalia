package fi.kalia.profile.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProfileTest {

	@Test
	void defaultsToAPrivateCellar() {
		Profile profile = Profile.create(UUID.randomUUID(), "alice");

		assertThat(profile.isCellarPublic()).isFalse();
	}

	@Test
	void changeCellarVisibilityFlipsTheFlag() {
		Profile profile = Profile.create(UUID.randomUUID(), "alice");

		profile.changeCellarVisibility(true);

		assertThat(profile.isCellarPublic()).isTrue();
	}

	@Test
	void rejectsANullId() {
		assertThatThrownBy(() -> Profile.create(null, "alice"))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsABlankUsername() {
		assertThatThrownBy(() -> Profile.create(UUID.randomUUID(), " "))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
