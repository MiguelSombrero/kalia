// Shared by the server-rendered first page and the client's "before" pages,
// so continuing the scroll never asks for a different page size than the
// first paint used.
export const FEED_PAGE_SIZE = 20;

// Under ADR-0060's 60s latency budget, and short enough that an E2E test can
// wait out a real tick.
export const LIVE_POLL_INTERVAL_MS = 15_000;

// No measured requirement behind the number; bounds the DOM rather than
// leaving it to grow all day.
export const FEED_LIST_CAP = 100;

export const STALLED_AFTER_FAILURES = 3;
