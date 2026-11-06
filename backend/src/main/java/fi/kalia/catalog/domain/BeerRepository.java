package fi.kalia.catalog.domain;

import jakarta.persistence.LockModeType;
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
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface BeerRepository extends JpaRepository<Beer, UUID>, JpaSpecificationExecutor<Beer> {

	// A suggestion is a pending beer that has a contributor (ADR-0102).
	String IS_SUGGESTION = """
			b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.PENDING
			AND b.contributorId IS NOT NULL""";

	@Override
	@EntityGraph(attributePaths = "brewery")
	Page<Beer> findAll(Specification<Beer> spec, Pageable pageable);

	// Brewery is loaded eagerly because entity-to-DTO mapping happens at the
	// web boundary, outside the service transaction (ADR-0007).
	@Override
	@EntityGraph(attributePaths = "brewery")
	Optional<Beer> findById(UUID id);

	@Override
	@EntityGraph(attributePaths = "brewery")
	Optional<Beer> findOne(Specification<Beer> spec);

	// Same eager-brewery reason as findById; an id matching nothing is simply
	// absent from the result, never a null element.
	@EntityGraph(attributePaths = "brewery")
	List<Beer> findByIdIn(Collection<UUID> ids);

	// Do not change this expression apart from beer_brewery_folded_name_idx
	// (V003): it must find exactly the row that index refuses a second of.
	@Query(value = """
			SELECT id FROM catalog.beer
			WHERE brewery_id = :breweryId AND catalog.fold_name(name) = catalog.fold_name(:name)
			AND moderation_status IN ('PENDING', 'APPROVED')""",
			nativeQuery = true)
	Optional<UUID> findIdByBreweryIdAndSameName(UUID breweryId, String name);

	@Query("""
			SELECT COUNT(b) > 0 FROM Beer b WHERE b.id = :id
			AND (b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.APPROVED
			  OR (b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.PENDING AND b.contributorId = :viewerId))""")
	boolean isVisibleTo(UUID id, UUID viewerId);

	// Do not call this inside a transaction the search does not own: SET LOCAL
	// lasts until the outermost transaction ends. Past pgjdbc's prepareThreshold
	// Postgres may switch to a generic plan, and for LIKE $1 that picks the
	// trigram index, which reads every entry for a 1-2-character pattern
	// (ADR-0078 Evidence).
	@Modifying
	@Query(value = "SET LOCAL plan_cache_mode = force_custom_plan", nativeQuery = true)
	void useCustomPlansForTheRestOfThisTransaction();

	// Held to the end of the transaction. The select wraps the call because it returns void.
	@Query(value = "SELECT 1 FROM (SELECT pg_advisory_xact_lock(:key)) AS locked", nativeQuery = true)
	int lockContributorAdds(long key);

	@Query("SELECT b.id FROM Beer b WHERE b.id IN :ids AND b.moderationStatus <> :status")
	List<UUID> findIdsByIdInAndModerationStatusNot(Collection<UUID> ids, ModerationStatus status);

	// The id breaks a tie in createdAt, so a page boundary never repeats or drops a row
	// of two added in the same instant. The pageable carries no sort of its own.
	@EntityGraph(attributePaths = "brewery")
	@Query(value = "SELECT b FROM Beer b WHERE " + IS_SUGGESTION + " ORDER BY b.createdAt, b.id",
			countQuery = "SELECT COUNT(b) FROM Beer b WHERE " + IS_SUGGESTION)
	Page<Beer> findSuggestions(Pageable pageable);

	@EntityGraph(attributePaths = "brewery")
	@Query("SELECT b FROM Beer b WHERE b.id = :id AND " + IS_SUGGESTION)
	Optional<Beer> findSuggestionById(UUID id);

	// One grouped read for a whole page of contributors; a status a contributor has none of is absent.
	@Query("""
			SELECT new fi.kalia.catalog.domain.ContributorStatusCount(b.contributorId, b.moderationStatus, COUNT(b))
			FROM Beer b
			WHERE b.contributorId IN :contributorIds
			AND b.moderationStatus IN (fi.kalia.catalog.domain.ModerationStatus.PENDING,
			                           fi.kalia.catalog.domain.ModerationStatus.REJECTED)
			GROUP BY b.contributorId, b.moderationStatus""")
	List<ContributorStatusCount> countPendingAndRejectedByContributor(Collection<UUID> contributorIds);

	// The first lock a decision takes (ADR-0102): a second decision on the same beer waits here and then
	// reads the status the first one left. The brewery is not joined, so its lock is taken apart.
	@Lock(LockModeType.PESSIMISTIC_WRITE)
	@Query("SELECT b FROM Beer b WHERE b.id = :id")
	Optional<Beer> findByIdForUpdate(UUID id);

	@Query("""
			SELECT COUNT(b) > 0 FROM Beer b WHERE b.brewery.id = :breweryId AND b.id <> :beerId
			AND b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.PENDING""")
	boolean existsOtherPendingAt(UUID breweryId, UUID beerId);

	long countByContributorIdAndModerationStatus(UUID contributorId, ModerationStatus moderationStatus);

	@Query("SELECT DISTINCT b.style FROM Beer b")
	List<String> findDistinctStyles();

	@Query("SELECT DISTINCT b.style FROM Beer b WHERE lower(b.style) = lower(:style)")
	List<String> findStylesIgnoringCase(String style);

}
