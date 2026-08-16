package fi.kalia.cellar.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BottleRepository extends JpaRepository<Bottle, UUID> {

	// Eager-loads entry: DTO mapping reads it after the transaction closes,
	// and spring.jpa.open-in-view is off, so a lazy read would fail.
	@Override
	@EntityGraph(attributePaths = "entry")
	Optional<Bottle> findById(UUID id);

	@EntityGraph(attributePaths = "entry")
	List<Bottle> findByEntryIdOrderByCreatedAt(UUID entryId);

}
