package fi.kalia.cellar.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BottleRepository extends JpaRepository<Bottle, UUID> {

	/**
	 * Overrides the inherited method to eager-load {@code entry}: a bottle
	 * crosses into the web layer for DTO mapping (its {@code entryId}) after
	 * the service transaction has closed, and {@code spring.jpa.open-in-view}
	 * is off, so a lazy association read there would fail rather than
	 * silently re-querying.
	 */
	@Override
	@EntityGraph(attributePaths = "entry")
	Optional<Bottle> findById(UUID id);

	@EntityGraph(attributePaths = "entry")
	List<Bottle> findByEntryIdOrderByCreatedAt(UUID entryId);

}
