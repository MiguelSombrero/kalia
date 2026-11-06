package fi.kalia.catalog.domain;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface ReviewRepository extends JpaRepository<Review, UUID> {

	Optional<Review> findFirstByBeerIdOrderByDecidedAtDescIdDesc(UUID beerId);

	// Another suggestion's approval after this instant is what approves a brewery that was still new when
	// a beer was suggested under it; one approved before it was an existing brewery by then.
	@Query("""
			SELECT COUNT(r) > 0 FROM Review r, Beer b WHERE r.beerId = b.id AND b.brewery.id = :breweryId
			AND r.outcome = fi.kalia.catalog.domain.ReviewOutcome.APPROVED AND r.decidedAt > :after""")
	boolean existsApprovalAtBreweryAfter(UUID breweryId, Instant after);

}
