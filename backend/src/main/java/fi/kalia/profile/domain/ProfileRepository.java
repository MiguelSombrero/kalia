package fi.kalia.profile.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

	// findFirst, not a single-result findByUsername: a Keycloak sub change
	// (ADR-0033) can leave two profile rows sharing one username, and the
	// newest is the one the current token's sub points at.
	Optional<Profile> findFirstByUsernameOrderByCreatedAtDesc(String username);

}
