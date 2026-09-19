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

// ADR-0040, same reasoning as readOlderFeedAction above. A truncated batch's
// own nextCursor is passed back as since on the next poll tick rather than
// chased in a loop here — the feed realistically changes hours apart
// (ADR-0060), so the simplest thing that stays correct is to let polling's
// own cadence catch up.
export const pollFeedAction = async (since: string): Promise<FeedPage> => {
  return readFeed({ since });
};
