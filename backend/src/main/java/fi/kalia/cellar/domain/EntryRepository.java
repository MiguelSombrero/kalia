package fi.kalia.cellar.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EntryRepository extends JpaRepository<Entry, UUID> {

	Optional<Entry> findByUserIdAndBeerId(UUID userId, UUID beerId);

	// Takes userId rather than checking existence first, so someone else's
	// entry and a nonexistent one both read as "not found".
	Optional<Entry> findByIdAndUserId(UUID id, UUID userId);

	// Quantity is derived by counting bottles, never stored (architecture.md
	// §3); grouping here keeps it one query instead of one per entry.
	@Query("""
			select e.id as id, e.beerId as beerId, count(b) as quantity,
			       e.createdAt as createdAt, e.updatedAt as updatedAt
			from Entry e left join e.bottles b
			where e.userId = :userId
			group by e.id, e.beerId, e.createdAt, e.updatedAt
			order by e.createdAt
			""")
	List<EntrySummary> findSummariesByUserId(@Param("userId") UUID userId);

}
