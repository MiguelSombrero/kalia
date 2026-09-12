package fi.kalia.profile;

import fi.kalia.profile.application.ProfileService;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.Assert;

/** Inter-module read API for {@code profile} (ADR-0007, ADR-0049). */
@Component
@RequiredArgsConstructor
public class ProfileApi {

	// Matches CatalogApi's batch cap for the same reason: a caller-supplied id
	// set must not grow an unbounded IN clause (ADR-0042).
	private static final int MAX_BATCH_IDS = 100;

	private final ProfileService profile;

	/** Empty when there is no public cellar for {@code username}; the caller cannot tell why (ADR-0050). */
	public Optional<UUID> publicCellarOwnerId(String username) {
		return profile.publicCellarOwnerId(username);
	}

	/** Absent for an unknown id, a missing profile row and a private cellar alike (ADR-0050). */
	public Map<UUID, String> publicUsernames(Collection<UUID> userIds) {
		Assert.isTrue(userIds.size() <= MAX_BATCH_IDS, "userIds must not exceed " + MAX_BATCH_IDS);
		return profile.publicUsernames(userIds);
	}

}
