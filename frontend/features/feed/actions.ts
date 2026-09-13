"use server";

import { FEED_PAGE_SIZE } from "./constants";
import { readFeed } from "./api";
import type { FeedPage } from "./types";

// ADR-0040: must stay a Server Action even though the feed endpoint itself is
// public — kaliaFetch still resolves through the server-only access-token
// lookup chain regardless of whether the call ends up sending one.
export const readOlderFeedAction = async (before: string): Promise<FeedPage> => {
  return readFeed({ before, size: FEED_PAGE_SIZE });
};
