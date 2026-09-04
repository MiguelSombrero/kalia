package fi.kalia.catalog.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface BeerRepository extends JpaRepository<Beer, UUID>, JpaSpecificationExecutor<Beer> {

	@Override
	@EntityGraph(attributePaths = "brewery")
	Page<Beer> findAll(Specification<Beer> spec, Pageable pageable);

	// Brewery is loaded eagerly because entity-to-DTO mapping happens at the
	// web boundary, outside the service transaction (ADR-0007).
	@Override
	@EntityGraph(attributePaths = "brewery")
	Optional<Beer> findById(UUID id);

	// Same eager-brewery reason as findById; an id matching nothing is simply
	// absent from the result, never a null element.
	@EntityGraph(attributePaths = "brewery")
	List<Beer> findByIdIn(Collection<UUID> ids);

}
