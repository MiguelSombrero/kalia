"use server";

import { isApiError } from "@/lib/api/api-error";
import { FEED_PAGE_SIZE } from "./constants";
import { readFeed } from "./api";
import type { FeedPage } from "./types";

// A Server Action's thrown error reaches the client stripped to
// name/message/stack (React Flight's own protocol) — kind and status never
// arrive, so a permanently invalid cursor must be told apart from a
// transient one here, before it crosses that boundary.
export type OlderFeedPage = FeedPage & { cursorExpired?: true };

// ADR-0040: must stay a Server Action even though the feed endpoint itself is
// public — kaliaFetch still resolves through the server-only access-token
// lookup chain regardless of whether the call ends up sending one.
export const readOlderFeedAction = async (before: string): Promise<OlderFeedPage> => {
  try {
    return await readFeed({ before, size: FEED_PAGE_SIZE });
  } catch (error) {
    // Same cause as pollFeedAction's startOver fold below: a before cursor
    // 400s identically once FeedCursorCodec's signing key rotates, but never
    // auto-recovers the way startOver does (FeedList.test.tsx: "offers a
    // page reload").
    if (isApiError(error) && error.kind === "http" && error.status === 400) {
      return { content: [], nextCursor: undefined, startOver: false, cursorExpired: true };
    }
    throw error;
  }
};

// ADR-0040, same reasoning as readOlderFeedAction above. A truncated batch's
// own nextCursor is passed back as since on the next poll tick rather than
// chased in a loop here — the feed realistically changes hours apart
// (ADR-0060), so the simplest thing that stays correct is to let polling's
// own cadence catch up.
export const pollFeedAction = async (since: string): Promise<FeedPage> => {
  try {
    return await readFeed({ since });
  } catch (error) {
    // A since cursor 400s only when it stops verifying — most concretely,
    // FeedCursorCodec.java's signing key was minted fresh by a backend
    // restart mid-session. Indistinguishable here from the aged-past-window
    // case FeedService.readSince already reports as startOver, and just as
    // unrecoverable without a fresh page, so it is folded into that same
    // signal rather than retried forever against a cursor that will never
    // verify again.
    if (isApiError(error) && error.kind === "http" && error.status === 400) {
      return { content: [], nextCursor: undefined, startOver: true };
    }
    throw error;
  }
};
