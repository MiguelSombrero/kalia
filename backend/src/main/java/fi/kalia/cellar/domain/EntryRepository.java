package fi.kalia.cellar.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EntryRepository extends JpaRepository<Entry, UUID> {

	Optional<Entry> findByUserIdAndBeerId(UUID userId, UUID beerId);

	// Takes userId rather than checking existence first, so someone else's
	// entry and a nonexistent one both read as "not found".
	@EntityGraph(attributePaths = "bottles")
	Optional<Entry> findByIdAndUserId(UUID id, UUID userId);

	// Bottles eager-loaded: DTO mapping runs outside the service transaction
	// (backend/README.md). Keyed on an already-resolved owner id — never relax
	// to load-then-filter, which turns a 404 into a 200 (ADR-0050).
	@EntityGraph(attributePaths = "bottles")
	@Query("select e from Entry e where e.userId = :userId order by e.createdAt")
	List<Entry> findWithBottlesByUserId(@Param("userId") UUID userId);

	// The aggregate that owns a given bottle, resolved for the caller. Ownership
	// is a property of this query — another user's bottle is indistinguishable
	// from a missing one (architecture.md §4) — so never relax it to a
	// load-by-id plus an after-the-fact check.
	@Query("select b.entry from Bottle b where b.id = :bottleId and b.entry.userId = :userId")
	Optional<Entry> findByBottleIdAndUserId(@Param("bottleId") UUID bottleId, @Param("userId") UUID userId);

	// Quantity is derived by counting bottles, never stored (architecture.md
	// §3); grouping here keeps it one query instead of one per entry. Inner
	// join, not left: an entry outlives no bottle (ADR-0034), so a zero here
	// would be a bug to hide, not a row to show.
	@Query("""
			select e.id as id, e.beerId as beerId, count(b) as quantity,
			       e.createdAt as createdAt, e.updatedAt as updatedAt
			from Entry e join e.bottles b
			where e.userId = :userId
			group by e.id, e.beerId, e.createdAt, e.updatedAt
			order by e.createdAt
			""")
	List<EntrySummary> findSummariesByUserId(@Param("userId") UUID userId);

}
