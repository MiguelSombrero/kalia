package fi.kalia.profile.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class ProfileTest {

	private static final Instant NOW = Instant.parse("2020-02-03T04:05:06Z");

	@Test
	void aProfileIsCreatedAtTheClocksInstant() {
		Profile profile = Profile.create(UUID.randomUUID(), "alice", Clock.fixed(NOW, ZoneOffset.UTC));

		assertThat(profile.getCreatedAt()).isEqualTo(NOW);
		assertThat(profile.getUpdatedAt()).isEqualTo(NOW);
	}

	@Test
	void changingTheCellarVisibilityStampsTheClocksInstant() {
		Profile profile = Profile.create(UUID.randomUUID(), "alice", Clock.fixed(NOW, ZoneOffset.UTC));
		Instant later = NOW.plus(Duration.ofHours(1));

		profile.changeCellarVisibility(true, Clock.fixed(later, ZoneOffset.UTC));

		assertThat(profile.getCreatedAt()).isEqualTo(NOW);
		assertThat(profile.getUpdatedAt()).isEqualTo(later);
	}

	@Test
	void leavingTheCellarVisibilityAsItWasKeepsTheUpdateInstant() {
		Profile profile = Profile.create(UUID.randomUUID(), "alice", Clock.fixed(NOW, ZoneOffset.UTC));

		profile.changeCellarVisibility(false, Clock.fixed(NOW.plus(Duration.ofHours(1)), ZoneOffset.UTC));

		assertThat(profile.getUpdatedAt()).isEqualTo(NOW);
	}

	@Test
	void defaultsToAPrivateCellar() {
		Profile profile = Profile.create(UUID.randomUUID(), "alice", Clock.systemUTC());

		assertThat(profile.isCellarPublic()).isFalse();
	}

	@Test
	void changeCellarVisibilityFlipsTheFlag() {
		Profile profile = Profile.create(UUID.randomUUID(), "alice", Clock.systemUTC());

		profile.changeCellarVisibility(true, Clock.systemUTC());

		assertThat(profile.isCellarPublic()).isTrue();
	}

	@Test
	void rejectsANullId() {
		assertThatThrownBy(() -> Profile.create(null, "alice", Clock.systemUTC()))
				.isInstanceOf(IllegalArgumentException.class);
	}

	@Test
	void rejectsABlankUsername() {
		assertThatThrownBy(() -> Profile.create(UUID.randomUUID(), " ", Clock.systemUTC()))
				.isInstanceOf(IllegalArgumentException.class);
	}

}
