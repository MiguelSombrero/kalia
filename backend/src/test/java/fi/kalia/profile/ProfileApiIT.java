package fi.kalia.profile;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import fi.kalia.TestcontainersConfiguration;
import fi.kalia.profile.application.ProfileService;
import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.context.annotation.Import;

@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Import(TestcontainersConfiguration.class)
class ProfileApiIT {

	@Autowired
	private ProfileRepository profiles;

	private ProfileApi api;

	@BeforeEach
	void setUp() {
		api = new ProfileApi(new ProfileService(profiles));
	}

	@Test
	void resolvesUsernamesForEveryPubliclyVisibleCellarInOneBatch() {
		UUID publicUserId = UUID.randomUUID();
		UUID privateUserId = UUID.randomUUID();
		profiles.save(makePublic(Profile.create(publicUserId, "alice")));
		profiles.save(Profile.create(privateUserId, "bob"));

		Map<UUID, String> usernames = api.publicUsernames(List.of(publicUserId, privateUserId));

		assertThat(usernames).containsExactly(Map.entry(publicUserId, "alice"));
	}

	// The map carries no visibility field to check separately — an id is
	// simply present or absent, so these two causes cannot be told apart by
	// construction rather than by an implementation choosing to hide them.
	@Test
	void aMissingProfileRowAndAPrivateCellarAreIndistinguishable() {
		UUID privateUserId = UUID.randomUUID();
		UUID unknownUserId = UUID.randomUUID();
		profiles.save(Profile.create(privateUserId, "bob"));

		Map<UUID, String> usernames = api.publicUsernames(List.of(privateUserId, unknownUserId));

		assertThat(usernames).isEmpty();
	}

	@Test
	void aRequestOverTheIdCapIsRejectedRatherThanExecuted() {
		List<UUID> tooMany = Stream.generate(UUID::randomUUID).limit(101).toList();

		assertThatThrownBy(() -> api.publicUsernames(tooMany)).isInstanceOf(IllegalArgumentException.class);
	}

	private static Profile makePublic(Profile profile) {
		profile.changeCellarVisibility(true);
		return profile;
	}

}
