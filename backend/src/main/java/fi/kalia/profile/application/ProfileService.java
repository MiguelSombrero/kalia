package fi.kalia.profile.application;

import fi.kalia.profile.domain.Profile;
import fi.kalia.profile.domain.ProfileRepository;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
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

	public Profile currentProfile(UUID userId, String username) {
		return profiles.findById(userId).orElseGet(() -> profiles.save(Profile.create(userId, username)));
	}

	public Profile changeCellarVisibility(UUID userId, String username, boolean cellarPublic) {
		Profile profile = currentProfile(userId, username);
		profile.changeCellarVisibility(cellarPublic);
		return profile;
	}

}
