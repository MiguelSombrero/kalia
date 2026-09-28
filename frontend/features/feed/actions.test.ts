import { describe, expect, it, vi } from "vitest";
import { apiError } from "@/lib/api/api-error";
import type { FeedPage } from "./types";

const { readFeed } = vi.hoisted(() => ({ readFeed: vi.fn() }));
vi.mock("./api", () => ({ readFeed }));

import { pollFeedAction, readOlderFeedAction } from "./actions";

const page = (): FeedPage => ({
  content: [
    {
      username: "alice",
      beerName: "AleSmith IPA",
      brewery: "AleSmith Brewing",
      quantity: 1,
      occurredAt: "2026-09-13T11:56:00.000Z",
      cursor: "c1",
    },
  ],
  nextCursor: undefined,
  startOver: false,
});

// Each test sets readFeed's mock implementation explicitly rather than
// relying on a shared beforeEach reset, and the rejecting cases run before
// the resolving one: Vitest 5.0.0's mock tracking (tinyspy) misreports a
// since-caught rejection as an unhandled test error when a mockRejectedValue
// case follows a mockResolvedValue case on the same vi.fn() through
// mockReset()/mockClear() — reproduced in isolation outside this file, not
// specific to pollFeedAction's own logic.
describe("pollFeedAction", () => {
  it("treats a 400 from an unverifiable cursor as startOver rather than a failure", async () => {
    readFeed.mockRejectedValueOnce(apiError("http", "Feed read failed with status 400", { status: 400 }));

    const result = await pollFeedAction("stale-cursor");

    expect(result).toEqual({ content: [], nextCursor: undefined, startOver: true });
  });

  it("does not swallow a transient failure the same way", async () => {
    readFeed.mockRejectedValueOnce(apiError("network", "Could not reach the backend"));

    const error = await pollFeedAction("c0").catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "network" });
  });

  it("does not swallow a non-cursor http failure either", async () => {
    readFeed.mockRejectedValueOnce(apiError("http", "Feed read failed with status 500", { status: 500 }));

    const error = await pollFeedAction("c0").catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "http", status: 500 });
  });

  it("passes through a successful read unchanged", async () => {
    readFeed.mockResolvedValueOnce(page());

    const result = await pollFeedAction("c0");

    expect(result).toEqual(page());
    expect(readFeed).toHaveBeenCalledWith({ since: "c0" });
  });
});

describe("readOlderFeedAction", () => {
  it("resolves a 400 from an unverifiable cursor as an empty, marked page rather than throwing", async () => {
    readFeed.mockRejectedValueOnce(apiError("http", "Feed read failed with status 400", { status: 400 }));

    const result = await readOlderFeedAction("stale-cursor");

    expect(result).toEqual({ content: [], nextCursor: undefined, startOver: false, cursorExpired: true });
  });

  it("does not swallow a transient failure the same way", async () => {
    readFeed.mockRejectedValueOnce(apiError("network", "Could not reach the backend"));

    const error = await readOlderFeedAction("c0").catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "network" });
  });

  it("does not swallow a non-cursor http failure either", async () => {
    readFeed.mockRejectedValueOnce(apiError("http", "Feed read failed with status 500", { status: 500 }));

    const error = await readOlderFeedAction("c0").catch((e: unknown) => e);

    expect(error).toMatchObject({ kind: "http", status: 500 });
  });

  it("passes through a successful read unchanged", async () => {
    readFeed.mockResolvedValueOnce(page());

    const result = await readOlderFeedAction("c0");

    expect(result).toEqual(page());
    expect(readFeed).toHaveBeenCalledWith({ before: "c0", size: 20 });
  });
});
