package fi.kalia.catalog.domain;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.jspecify.annotations.Nullable;
import org.springframework.data.jpa.domain.Specification;

public final class BeerSpecifications {

	private static final char LIKE_ESCAPE_CHAR = '\\';

	private BeerSpecifications() {
	}

	// %/_ are LIKE wildcards; escape them so a user searching for e.g. "10%"
	// matches that literal text rather than an arbitrary-length run of digits.
	static String escapeLikeWildcards(String value) {
		return value
				.replace("\\", "\\\\")
				.replace("%", "\\%")
				.replace("_", "\\_");
	}

	/** What a viewer may see: approved rows, and their own pending ones when signed in (ADR-0091). */
	public static Specification<Beer> visibleTo(@Nullable UUID viewerId) {
		return (root, query, cb) -> {
			Predicate approved = cb.equal(root.get("moderationStatus"), ModerationStatus.APPROVED);
			if (viewerId == null) {
				return approved;
			}
			return cb.or(approved, cb.and(cb.equal(root.get("moderationStatus"), ModerationStatus.PENDING),
					cb.equal(root.get("contributorId"), viewerId)));
		};
	}

	public static Specification<Beer> matching(BeerSearchCriteria criteria) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (criteria.query() != null && !criteria.query().isBlank()) {
				predicates.add(cb.like(cb.lower(root.get("name")),
						"%" + escapeLikeWildcards(criteria.query().toLowerCase(Locale.ROOT)) + "%",
						LIKE_ESCAPE_CHAR));
			}
			if (criteria.nameWords() != null) {
				predicates.add(cb.or(criteria.nameWords().stream()
						.map(word -> cb.like(cb.lower(root.get("name")),
								"%" + escapeLikeWildcards(word.toLowerCase(Locale.ROOT)) + "%", LIKE_ESCAPE_CHAR))
						.toArray(Predicate[]::new)));
			}
			if (criteria.style() != null && !criteria.style().isBlank()) {
				predicates.add(cb.equal(cb.lower(root.get("style")),
						criteria.style().toLowerCase(Locale.ROOT)));
			}
			if (criteria.breweryId() != null) {
				predicates.add(cb.equal(root.get("brewery").get("id"), criteria.breweryId()));
			}
			if (criteria.countryCode() != null && !criteria.countryCode().isBlank()) {
				predicates.add(cb.equal(root.get("brewery").get("countryCode"), criteria.countryCode()));
			}
			if (criteria.minAbv() != null) {
				predicates.add(cb.greaterThanOrEqualTo(root.get("abv"), criteria.minAbv()));
			}
			if (criteria.maxAbv() != null) {
				predicates.add(cb.lessThanOrEqualTo(root.get("abv"), criteria.maxAbv()));
			}
			return cb.and(predicates.toArray(Predicate[]::new));
		};
	}

}
