package fi.kalia.profile.application;

import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.util.Collection;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.resilience.annotation.Retryable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ProfileService {

	private final ProfileRepository profiles;

	// A missing row reads as private (ADR-0049).
	public boolean isCellarPublic(UUID userId) {
		return profiles.findById(userId).map(Profile::isCellarPublic).orElse(false);
	}

	// Do not add a per-entry visibility flag: an id with no profile row and one
	// whose cellar is private must stay indistinguishable, so both are simply
	// absent from the map rather than present with cellarPublic=false (ADR-0050).
	public Map<UUID, String> publicUsernames(Collection<UUID> userIds) {
		return profiles.findAllById(userIds).stream()
				.filter(Profile::isCellarPublic)
				.collect(Collectors.toMap(Profile::getId, Profile::getUsername));
	}

	// Empty for an unknown username, a missing profile row and a private cellar
	// alike — the caller must not be able to tell them apart (ADR-0050).
	public Optional<UUID> publicCellarOwnerId(String username) {
		return profiles.findFirstByUsernameOrderByCreatedAtDesc(username)
				.filter(Profile::isCellarPublic)
				.map(Profile::getId);
	}

	// ADR-0057's shape, applied to the module it named as a likely second
	// case: two first-ever requests for the same brand-new user both see no
	// row and both insert; the loser trips `profile_pkey` and retries into
	// the winner's now-committed row instead of 500ing. Each retry's own
	// transaction is verified by ProfileServiceConcurrencyIT.
	@Retryable(includes = DataIntegrityViolationException.class, maxRetries = 1, delay = 0)
	public Profile currentProfile(UUID userId, String username) {
		return profiles.findById(userId).orElseGet(() -> profiles.save(Profile.create(userId, username)));
	}

	// Its own retry, not just currentProfile's: a self-invocation of another
	// @Retryable method on the same bean bypasses the proxy entirely, so this
	// needs the annotation directly to survive the same race landing here —
	// e.g. a PATCH racing the GET above for the same brand-new user.
	@Retryable(includes = DataIntegrityViolationException.class, maxRetries = 1, delay = 0)
	public Profile changeCellarVisibility(UUID userId, String username, boolean cellarPublic) {
		Profile profile = currentProfile(userId, username);
		profile.changeCellarVisibility(cellarPublic);
		return profile;
	}

}
