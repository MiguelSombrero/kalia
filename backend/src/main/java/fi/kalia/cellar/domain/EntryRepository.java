package fi.kalia.cellar.domain;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface EntryRepository extends JpaRepository<Entry, UUID> {

	Optional<Entry> findByUserIdAndBeerId(UUID userId, UUID beerId);

}
