package fi.kalia.catalog;

import java.util.List;

/**
 * Pagination envelope per docs/architecture.md §4.
 */
public record PageDto<T>(List<T> content, long totalElements, int totalPages, int page) {
}
