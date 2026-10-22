package fi.kalia.profile;

import fi.kalia.profile.application.ProfileService;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import java.util.stream.Gatherers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Inter-module read API for {@code profile} (ADR-0007, ADR-0049). */
@Component
@RequiredArgsConstructor
public class ProfileApi {

	// Matches CatalogApi's batch cap for the same reason: one query's IN
	// clause must not grow with a caller-supplied id set (ADR-0042).
	static final int MAX_BATCH_IDS = 100;

	private final ProfileService profile;

	/** Empty when there is no public cellar for {@code username}; the caller cannot tell why (ADR-0050). */
	public Optional<UUID> publicCellarOwnerId(String username) {
		return profile.publicCellarOwnerId(username);
	}

	/** Absent for an unknown id, a missing profile row and a private cellar alike (ADR-0050). */
	public Map<UUID, String> publicUsernames(Collection<UUID> userIds) {
		return userIds.stream()
				.distinct()
				.gather(Gatherers.windowFixed(MAX_BATCH_IDS))
				.flatMap(chunk -> profile.publicUsernames(chunk).entrySet().stream())
				.collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));
	}

}
