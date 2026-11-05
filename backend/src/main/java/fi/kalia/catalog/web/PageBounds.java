package fi.kalia.catalog.web;

import fi.kalia.catalog.application.InvalidSearchParameterException;

final class PageBounds {

	/** A single page pulls at most this many rows, so no one response can return an unbounded slice of a table. */
	static final long MAX_PAGE_SIZE = 100;

	/** Rows a page may skip (page × size): keeps one request's cost fixed however large the table grows, since past it a visitor narrows the search instead. */
	static final long MAX_OFFSET = 10_000;

	static final String OFFSET_BOUND = "A page skipping more than " + MAX_OFFSET + " rows (page × size) is refused with 400 problem+json.";

	static final String PAGE_DESCRIPTION = "Zero-based page index; page × size is at most " + MAX_OFFSET;

	private PageBounds() {
	}

	// See backend/README.md's "Every request parameter is bounded" convention.
	static void requireBoundedOffset(int page, int size) {
		if ((long) page * size > MAX_OFFSET) {
			throw new InvalidSearchParameterException(
					"page (%d) × size (%d) must not skip more than %d rows; narrow the search instead"
							.formatted(page, size, MAX_OFFSET));
		}
	}

}
