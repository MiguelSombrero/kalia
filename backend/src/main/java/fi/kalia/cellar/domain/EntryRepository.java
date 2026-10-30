package fi.kalia.cellar.domain;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EntryRepository extends JpaRepository<Entry, UUID> {

	Optional<Entry> findByUserIdAndBeerId(UUID userId, UUID beerId);

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

	@Query("select e.beerId from Entry e where e.userId = :userId")
	List<UUID> findBeerIdsByUserId(@Param("userId") UUID userId);

	// One page of a public cellar, in the order the beers were added, no bottles
	// loaded, without the entries of `excludedBeerIds`. Keyed on an already-resolved
	// owner id, like the read above (ADR-0050). An empty collection excludes nothing.
	@Query(value = "select e from Entry e where e.userId = :userId and e.beerId not in :excludedBeerIds "
			+ "order by e.createdAt, e.id",
			countQuery = "select count(e) from Entry e where e.userId = :userId and e.beerId not in :excludedBeerIds")
	Page<Entry> findPageByUserIdExcludingBeers(@Param("userId") UUID userId,
			@Param("excludedBeerIds") Collection<UUID> excludedBeerIds, Pageable pageable);

	@Query("select new fi.kalia.cellar.domain.BottleCount(b.entry.id, count(b)) from Bottle b "
			+ "where b.entry.id in :entryIds group by b.entry.id")
	List<BottleCount> countBottlesByEntryId(@Param("entryIds") Collection<UUID> entryIds);

	// The ids of the oldest `limit` bottles of each entry, an index range scan per
	// entry (bottle_entry_id_created_at_idx), so a beer with thousands of bottles
	// costs no more than one with `limit`. Ids, not Bottles: an owned entity is
	// read through its aggregate root or as a projection (ADR-0052).
	@Query(value = """
			select b.id from cellar.entry e
			cross join lateral (
				select * from cellar.bottle where entry_id = e.id order by created_at, id limit :limit
			) b
			where e.id in (:entryIds)
			order by b.created_at, b.id""", nativeQuery = true)
	List<UUID> findIdsOfOldestBottlesOfEntries(@Param("entryIds") Collection<UUID> entryIds, @Param("limit") int limit);

	@Query("select new fi.kalia.cellar.domain.BottleListing(b.id, b.entry.id, b.containerType, b.brewedDate, "
			+ "b.bestBeforeDate, b.createdAt, b.updatedAt) from Bottle b where b.id in :ids "
			+ "order by b.createdAt, b.id")
	List<BottleListing> listBottles(@Param("ids") Collection<UUID> ids);

	@Query("select new fi.kalia.cellar.domain.BottleTotals(count(b), max(b.createdAt)) from Bottle b "
			+ "where b.entry.userId = :userId and b.entry.beerId not in :excludedBeerIds")
	BottleTotals totalBottlesOfExcludingBeers(@Param("userId") UUID userId,
			@Param("excludedBeerIds") Collection<UUID> excludedBeerIds);

}
