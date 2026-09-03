package fi.kalia.profile;

import fi.kalia.profile.application.ProfileService;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Inter-module read API for {@code profile} (ADR-0007, ADR-0049). */
@Component
@RequiredArgsConstructor
public class ProfileApi {

	private final ProfileService profile;

	/** Empty when there is no public cellar for {@code username}; the caller cannot tell why (ADR-0050). */
	public Optional<UUID> publicCellarOwnerId(String username) {
		return profile.publicCellarOwnerId(username);
	}

}
