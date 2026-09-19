// Shared by the server-rendered first page and the client's "before" pages,
// so continuing the scroll never asks for a different page size than the
// first paint used.
export const FEED_PAGE_SIZE = 20;
