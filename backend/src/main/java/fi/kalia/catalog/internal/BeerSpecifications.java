package fi.kalia.catalog.internal;

import fi.kalia.catalog.BeerSearchCriteria;
import jakarta.persistence.criteria.Predicate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.jpa.domain.Specification;

final class BeerSpecifications {

	private BeerSpecifications() {
	}

	static Specification<Beer> matching(BeerSearchCriteria criteria) {
		return (root, query, cb) -> {
			List<Predicate> predicates = new ArrayList<>();
			if (criteria.query() != null && !criteria.query().isBlank()) {
				predicates.add(cb.like(cb.lower(root.get("name")),
						"%" + criteria.query().toLowerCase() + "%"));
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
