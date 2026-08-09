package fi.kalia.cellar.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EntryRepository extends JpaRepository<Entry, UUID> {

	Optional<Entry> findByUserIdAndBeerId(UUID userId, UUID beerId);

	/**
	 * Takes {@code userId} rather than checking existence first: a caller must
	 * get the same "not found" for someone else's entry as for one that never
	 * existed, or the two cases become distinguishable by response.
	 */
	Optional<Entry> findByIdAndUserId(UUID id, UUID userId);

	/**
	 * Quantity is derived by counting bottles, never stored
	 * (architecture.md §3) — grouping here keeps that a single query per
	 * caller instead of one count query per entry.
	 */
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
