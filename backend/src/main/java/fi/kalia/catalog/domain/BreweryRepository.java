package fi.kalia.catalog.domain;

import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface BreweryRepository extends JpaRepository<Brewery, UUID> {

	// Both order by the stored key, which index brewery_name_sort_key_idx serves
	// (ADR-0087); id breaks ties between names that differ only in case.
	// The visibility predicate is BeerSpecifications.visibleTo's, for breweries (ADR-0091).
	@Query("""
			SELECT b FROM Brewery b
			WHERE b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.APPROVED
			   OR (b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.PENDING AND b.contributorId = :viewerId)
			ORDER BY b.nameSortKey, b.id""")
	Page<Brewery> findPage(@Nullable UUID viewerId, Pageable pageable);

	@Query("""
			SELECT b FROM Brewery b WHERE lower(b.name) LIKE :pattern ESCAPE '\\'
			AND (b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.APPROVED
			  OR (b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.PENDING AND b.contributorId = :viewerId))
			ORDER BY b.nameSortKey, b.id""")
	Page<Brewery> findPageByLowerNameLike(String pattern, @Nullable UUID viewerId, Pageable pageable);

	default Page<Brewery> findPageByNameContaining(String name, @Nullable UUID viewerId, Pageable pageable) {
		return findPageByLowerNameLike(
				"%" + BeerSpecifications.escapeLikeWildcards(name.toLowerCase(Locale.ROOT)) + "%", viewerId, pageable);
	}

	@Query("""
			SELECT b FROM Brewery b WHERE b.id = :id
			AND (b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.APPROVED
			  OR (b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.PENDING AND b.contributorId = :viewerId))""")
	Optional<Brewery> findVisibleById(UUID id, @Nullable UUID viewerId);

	long countByContributorIdAndModerationStatus(UUID contributorId, ModerationStatus moderationStatus);

	// Do not change these expressions apart from brewery_folded_name_country_idx (V003).
	@Query(value = """
			SELECT id FROM catalog.brewery
			WHERE catalog.fold_name(name) = catalog.fold_name(:name) AND country_code = :countryCode
			AND moderation_status IN ('PENDING', 'APPROVED')""",
			nativeQuery = true)
	Optional<UUID> findIdBySameNameAndCountryCode(String name, String countryCode);

	@Query("""
			SELECT DISTINCT b.countryCode FROM Brewery b
			WHERE b.moderationStatus = fi.kalia.catalog.domain.ModerationStatus.APPROVED ORDER BY b.countryCode""")
	List<String> findDistinctCountryCodes();

}
