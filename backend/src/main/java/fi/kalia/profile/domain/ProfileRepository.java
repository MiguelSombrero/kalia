package fi.kalia.profile.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ProfileRepository extends JpaRepository<Profile, UUID> {

	// Do not let Spring Data derive this from its name: a derived IgnoringCase
	// compares upper() on both sides, which profile_username_lower_key cannot
	// serve, so every lookup would scan the table.
	@Query("select p from Profile p where lower(p.username) = lower(:username)")
	Optional<Profile> findByUsernameIgnoringCase(String username);

}
