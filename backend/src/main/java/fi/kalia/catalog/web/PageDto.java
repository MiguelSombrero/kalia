package fi.kalia.catalog.web;

import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;
import org.springframework.data.domain.Page;

/**
 * Pagination envelope per docs/architecture.md §4.
 */
public record PageDto<T>(
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) List<T> content,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) long totalElements,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) int totalPages,
		@Schema(requiredMode = Schema.RequiredMode.REQUIRED) int page) {

	static <T> PageDto<T> from(Page<T> page) {
		return new PageDto<>(page.getContent(), page.getTotalElements(), page.getTotalPages(),
				page.getNumber());
	}

}
