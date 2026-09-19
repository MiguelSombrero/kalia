import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";
import { FEED_LIST_CAP, LIVE_POLL_INTERVAL_MS, STALLED_AFTER_FAILURES } from "./constants";
import type { FeedPage } from "./types";

const { readOlderFeedAction, pollFeedAction } = vi.hoisted(() => ({
  readOlderFeedAction: vi.fn(),
  pollFeedAction: vi.fn(),
}));
vi.mock("./actions", () => ({ readOlderFeedAction, pollFeedAction }));

import { FeedList } from "./FeedList";

type IntersectionObserverStub = IntersectionObserver & { trigger: (isIntersecting: boolean) => void };

const intersectionObserverInstances: IntersectionObserverStub[] = [];

// The real API's behavior a naive mock would miss: observe() reports the
// target's current state right away, even to a brand-new observer that
// replaces a disconnected one — this persists across instances so a test can
// simulate "the sentinel is still on screen" the way FeedList.tsx's own
// effect re-observing mid-fetch would see it in a real browser.
let sentinelIsIntersecting = false;

// jsdom has no IntersectionObserver at all; FeedList.tsx's `new
// IntersectionObserver(callback)` needs a global that supports `new`. Vitest
// only makes a vi.fn() mock constructible when its implementation is a real
// `function`, not an arrow function (confirmed: an arrow implementation logs
// "did not use 'function' or 'class'" and `new` throws) — the one place this
// file cannot follow the arrow-functions-only convention.
// eslint-disable-next-line no-restricted-syntax
const IntersectionObserverMock = vi.fn(function (callback: IntersectionObserverCallback) {
  const instance: IntersectionObserverStub = {
    root: null,
    rootMargin: "",
    thresholds: [],
    observe: vi.fn(() => {
      callback([{ isIntersecting: sentinelIsIntersecting } as IntersectionObserverEntry], instance);
    }),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
    takeRecords: () => [],
    trigger: (isIntersecting: boolean) => {
      sentinelIsIntersecting = isIntersecting;
      callback([{ isIntersecting } as IntersectionObserverEntry], instance);
    },
  };
  intersectionObserverInstances.push(instance);
  return instance;
});

// A same-tick mockResolvedValue lets React and TanStack Query batch the
// fetch's start and finish into one commit, which hides the isFetchingNextPage
// transition an effect would otherwise see — a real network round trip never
// resolves that fast. This is what makes the transition observable in a test.
const resolveAfterATick = <T,>(value: T): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), 10));

const line = (cursor: string, username: string) => ({
  username,
  beerName: "AleSmith IPA",
  brewery: "AleSmith Brewing",
  quantity: 1,
  occurredAt: "2026-09-13T11:56:00.000Z",
  cursor,
});

const renderList = (initialPage: FeedPage, locale: Locale = "en", emptyState: ReactNode = <p>empty</p>) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  // A function, not a memoized element: TanStack Query notifies React of a
  // background update (e.g. a poll tick) through a real `setTimeout(fn, 0)`
  // (query-core's notifyManager), which measurably does not fire within
  // `vi.advanceTimersByTimeAsync` under Vitest's fake timers — the query
  // cache updates (confirmed by reading it directly) but the component never
  // re-renders on its own. Re-rendering picks up the fresh snapshot instead,
  // the way a real browser's own event loop would have a tick later — but
  // only when given a genuinely new element each call: React bails out of
  // reconciling (and never re-invokes FeedList) when `rerender()` receives
  // the exact same element reference back (confirmed by comparison against
  // RTL's own renderHook, which builds a fresh element per rerender call).
  const buildElement = () => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <FeedList
          locale={locale}
          now="2026-09-13T12:00:00.000Z"
          initialPage={initialPage}
          emptyState={emptyState}
        />
      </I18nextProvider>
    </QueryClientProvider>
  );
  const view = render(buildElement());
  const poke = () => view.rerender(buildElement());
  return { ...view, poke };
};

const emptyPoll = (): FeedPage => ({ content: [], nextCursor: undefined, startOver: false });

const advancePoll = async (poke: () => void, ms = LIVE_POLL_INTERVAL_MS) => {
  await act(() => vi.advanceTimersByTimeAsync(ms));
  act(poke);
};

beforeEach(() => {
  readOlderFeedAction.mockReset();
  pollFeedAction.mockReset();
  pollFeedAction.mockResolvedValue(emptyPoll());
  intersectionObserverInstances.length = 0;
  sentinelIsIntersecting = false;
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
});

afterEach(() => {
  // Undoes any setFocused() a test called, so the next test starts from
  // TanStack Query's real default (falls back to document.visibilityState).
  focusManager.setFocused(undefined);
});

describe("FeedList", () => {
  it("renders the server-rendered first page without fetching anything", () => {
    renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });

    expect(screen.getByRole("link", { name: "alice" })).toBeInTheDocument();
    expect(readOlderFeedAction).not.toHaveBeenCalled();
  });

  it("renders no scroll sentinel when the first page already covers the window", () => {
    renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("loads and appends the next page when the sentinel scrolls into view", async () => {
    readOlderFeedAction.mockResolvedValue({
      content: [line("c2", "bob")],
      nextCursor: undefined,
      startOver: false,
    });
    renderList({ content: [line("c1", "alice")], nextCursor: "c1", startOver: false });

    expect(screen.getByRole("status")).toBeInTheDocument();
    act(() => intersectionObserverInstances[0]!.trigger(true));

    await waitFor(() => expect(readOlderFeedAction).toHaveBeenCalledWith("c1"));
    await waitFor(() => expect(screen.getByRole("link", { name: "bob" })).toBeInTheDocument());
    expect(screen.getByRole("link", { name: "alice" })).toBeInTheDocument();
  });

  it("stops asking once the window is exhausted, rather than looping", async () => {
    readOlderFeedAction.mockResolvedValue({
      content: [line("c2", "bob")],
      nextCursor: undefined,
      startOver: false,
    });
    renderList({ content: [line("c1", "alice")], nextCursor: "c1", startOver: false });

    act(() => intersectionObserverInstances[0]!.trigger(true));
    await waitFor(() => expect(screen.getByRole("link", { name: "bob" })).toBeInTheDocument());

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(readOlderFeedAction).toHaveBeenCalledTimes(1);
  });

  it("does not keep fetching on its own once the sentinel is scrolled into view", async () => {
    // A page that still has more (nextCursor set) leaves the sentinel
    // mounted and, per the mock above, still reporting "intersecting" after
    // the fetch completes — exactly the state a real browser's observer
    // would report to a freshly re-created instance. Only a second, genuine
    // scroll (not modeled here) may fetch again.
    readOlderFeedAction.mockImplementation(() =>
      resolveAfterATick({ content: [line("c2", "bob")], nextCursor: "c2", startOver: false }),
    );
    renderList({ content: [line("c1", "alice")], nextCursor: "c1", startOver: false });

    act(() => intersectionObserverInstances[0]!.trigger(true));
    await waitFor(() => expect(screen.getByRole("link", { name: "bob" })).toBeInTheDocument());
    // Give any runaway auto-fetch a chance to fire before asserting it didn't.
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(readOlderFeedAction).toHaveBeenCalledTimes(1);
  });

  it("has no accessibility violations while a sentinel is present, in English", async () => {
    const { container } = renderList({
      content: [line("c1", "alice")],
      nextCursor: "c1",
      startOver: false,
    });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations while a sentinel is present, in Finnish", async () => {
    const { container } = renderList(
      { content: [line("c1", "alice")], nextCursor: "c1", startOver: false },
      "fi",
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});

const linesFrom = (count: number, startAt: number): ReturnType<typeof line>[] =>
  Array.from({ length: count }, (_, index) => line(`c${startAt + index}`, `user${startAt + index}`));

describe("FeedList live polling", () => {
  it("does not poll on mount, only the server-rendered first page is shown", () => {
    renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });

    expect(pollFeedAction).not.toHaveBeenCalled();
  });

  it("still polls a feed that started empty, and replaces the empty state once revealed", async () => {
    pollFeedAction.mockResolvedValue({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      const { poke } = renderList(
        { content: [], nextCursor: undefined, startOver: false },
        "en",
        <p>Nothing here yet.</p>,
      );
      expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();

      await advancePoll(poke);

      // Started with no cursor at all — the backend treats a blank `since`
      // the same as no cursor, reading the most recent page instead.
      expect(pollFeedAction).toHaveBeenCalledWith("");
      act(() => screen.getByRole("button", { name: "1 new event" }).click());

      expect(screen.getByRole("link", { name: "alice" })).toBeInTheDocument();
      expect(screen.queryByText("Nothing here yet.")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("surfaces a new-events control and holds arrivals out of the list until it is activated", async () => {
    pollFeedAction.mockResolvedValue({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      const { poke } = renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll(poke);

      expect(screen.queryByRole("link", { name: "bob" })).not.toBeInTheDocument();
      const control = screen.getByRole("button", { name: "1 new event" });
      act(() => control.click());

      expect(screen.getByRole("link", { name: "bob" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /new event/ })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops polling while the tab is hidden and catches up once it is focused again", async () => {
    vi.useFakeTimers();
    try {
      const { poke } = renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      focusManager.setFocused(false);

      await advancePoll(poke, LIVE_POLL_INTERVAL_MS * 3);
      expect(pollFeedAction).not.toHaveBeenCalled();

      pollFeedAction.mockResolvedValue({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
      await act(async () => {
        focusManager.setFocused(true);
        await vi.advanceTimersByTimeAsync(0);
      });
      act(poke);

      expect(pollFeedAction).toHaveBeenCalledWith("c1");
      expect(screen.getByRole("button", { name: "1 new event" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not show an event twice that a later poll redelivers", async () => {
    vi.useFakeTimers();
    try {
      pollFeedAction.mockResolvedValueOnce({
        content: [line("c2", "bob")],
        nextCursor: undefined,
        startOver: false,
      });
      const { poke } = renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll(poke);

      // Redelivers c2 alongside a genuinely new c3 (ADR-0060: at-least-once delivery).
      pollFeedAction.mockResolvedValueOnce({
        content: [line("c3", "carol"), line("c2", "bob")],
        nextCursor: undefined,
        startOver: false,
      });
      await advancePoll(poke);

      expect(screen.getByRole("button", { name: "2 new events" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves no hole and no duplicate when a failed poll is followed by a successful one", async () => {
    vi.useFakeTimers();
    try {
      pollFeedAction.mockRejectedValueOnce(new Error("network error"));
      const { poke } = renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll(poke);

      pollFeedAction.mockResolvedValueOnce({
        content: [line("c2", "bob")],
        nextCursor: undefined,
        startOver: false,
      });
      await advancePoll(poke);

      expect(pollFeedAction).toHaveBeenNthCalledWith(1, "c1");
      expect(pollFeedAction).toHaveBeenNthCalledWith(2, "c1");
      expect(screen.getByRole("button", { name: "1 new event" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("surfaces the stalled notice after repeated failures, and a successful poll clears it", async () => {
    vi.useFakeTimers();
    try {
      pollFeedAction.mockRejectedValue(new Error("network error"));
      const { poke } = renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });

      for (let i = 0; i < STALLED_AFTER_FAILURES - 1; i++) {
        await advancePoll(poke);
      }
      expect(screen.queryByText("Having trouble keeping this up to date.")).not.toBeInTheDocument();

      await advancePoll(poke);
      expect(screen.getByText("Having trouble keeping this up to date.")).toBeInTheDocument();

      pollFeedAction.mockResolvedValue(emptyPoll());
      await act(async () => {
        screen.getByRole("button", { name: "Retry" }).click();
        await vi.advanceTimersByTimeAsync(0);
      });
      act(poke);

      expect(screen.queryByText("Having trouble keeping this up to date.")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("caps arrivals at the head instead of growing the list without bound", async () => {
    pollFeedAction.mockResolvedValue({
      content: linesFrom(FEED_LIST_CAP + 20, 2),
      nextCursor: undefined,
      startOver: false,
    });
    vi.useFakeTimers();
    try {
      const { poke } = renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll(poke);

      const control = screen.getByRole("button", { name: `${FEED_LIST_CAP} new events` });
      act(() => control.click());

      expect(screen.getAllByRole("listitem")).toHaveLength(FEED_LIST_CAP);
    } finally {
      vi.useRealTimers();
    }
  });

  it("stops offering to load older history once the cap is reached", async () => {
    // hasNextPage stays true (nextCursor: "c0") — the sentinel must disappear
    // because the cap is reached, not because history ran out.
    const firstPage = { content: linesFrom(FEED_LIST_CAP - 1, 1), nextCursor: "c0", startOver: false };
    pollFeedAction.mockResolvedValue({ content: [line("new", "amy")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      const { poke } = renderList(firstPage);
      expect(screen.getByRole("status")).toBeInTheDocument();

      await advancePoll(poke);
      act(() => screen.getByRole("button", { name: "1 new event" }).click());

      expect(screen.getAllByRole("listitem")).toHaveLength(FEED_LIST_CAP);
      expect(screen.queryByRole("status")).not.toBeInTheDocument();
      expect(readOlderFeedAction).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("has no accessibility violations with the new-events control showing, in English", async () => {
    pollFeedAction.mockResolvedValue({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      const { container, poke } = renderList({
        content: [line("c1", "alice")],
        nextCursor: undefined,
        startOver: false,
      });
      await advancePoll(poke);
      vi.useRealTimers();

      expect(await axe(container)).toHaveNoViolations();
    } finally {
      vi.useRealTimers();
    }
  });

  it("has no accessibility violations with the new-events control showing, in Finnish", async () => {
    pollFeedAction.mockResolvedValue({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      const { container, poke } = renderList(
        { content: [line("c1", "alice")], nextCursor: undefined, startOver: false },
        "fi",
      );
      await advancePoll(poke);
      vi.useRealTimers();

      expect(await axe(container)).toHaveNoViolations();
    } finally {
      vi.useRealTimers();
    }
  });
});
