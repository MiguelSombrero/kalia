// Shared by the server-rendered first page and the client's "before" pages,
// so continuing the scroll never asks for a different page size than the
// first paint used.
export const FEED_PAGE_SIZE = 20;

// Comfortably under the 60-second latency budget (ADR-0060) while short
// enough that an E2E test can wait out one tick.
export const LIVE_POLL_INTERVAL_MS = 15_000;

// Bounds the rendered list at both ends — arrivals at the head and backward
// pagination at the foot — so a tab left open all day does not grow the DOM
// without limit.
export const FEED_LIST_CAP = 100;

// Consecutive failed poll ticks before the page admits the feed is stalled,
// rather than reacting to one transient failure.
export const STALLED_AFTER_FAILURES = 3;
