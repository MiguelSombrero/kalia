package fi.kalia.catalog.domain;

import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

public final class BeerSpecifications {

	private static final char LIKE_ESCAPE_CHAR = '\\';

	private BeerSpecifications() {
	}

	// %/_ are LIKE wildcards; escape them so a user searching for e.g. "10%"
	// matches that literal text rather than an arbitrary-length run of digits.
	private static String escapeLikeWildcards(String value) {
		return value
				.replace("\\", "\\\\")
				.replace("%", "\\%")
				.replace("_", "\\_");
	}

	public static Specification<Beer> matching(BeerSearchCriteria criteria) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (criteria.query() != null && !criteria.query().isBlank()) {
				predicates.add(cb.like(cb.lower(root.get("name")),
						"%" + escapeLikeWildcards(criteria.query().toLowerCase()) + "%",
						LIKE_ESCAPE_CHAR));
			}
			if (criteria.style() != null && !criteria.style().isBlank()) {
				predicates.add(cb.equal(cb.lower(root.get("style")),
						criteria.style().toLowerCase()));
			}
			if (criteria.breweryId() != null) {
				predicates.add(cb.equal(root.get("brewery").get("id"), criteria.breweryId()));
			}
			if (criteria.country() != null && !criteria.country().isBlank()) {
				predicates.add(cb.equal(cb.lower(root.get("brewery").get("country")),
						criteria.country().toLowerCase()));
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
