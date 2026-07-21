package fi.kalia.catalog.web;

import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Pagination envelope per docs/architecture.md §4.
 */
public record PageDto<T>(List<T> content, long totalElements, int totalPages, int page) {

	static <T> PageDto<T> from(Page<T> page) {
		return new PageDto<>(page.getContent(), page.getTotalElements(), page.getTotalPages(),
				page.getNumber());
	}

}
