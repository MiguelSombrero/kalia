import { focusManager, notifyManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";
import { apiError } from "@/lib/api/api-error";
import { FEED_LIST_CAP, LIVE_POLL_INTERVAL_MS, STALLED_AFTER_FAILURES } from "./constants";
import type { FeedPage } from "./types";

// query-core's notifyManager schedules a background update's React
// notification through a real `setTimeout(fn, 0)`, which measurably never
// fires within `vi.advanceTimersByTimeAsync` under Vitest's fake timers —
// the query cache updates (confirmed by reading it directly) but the
// component never re-renders on its own. Runs it synchronously instead, so
// `act(() => vi.advanceTimersByTimeAsync(...))` alone is enough to observe a
// poll tick's result, the same as a real browser's own event loop would a
// moment later.
notifyManager.setScheduler((callback) => callback());

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

const renderList = (
  initialPage: FeedPage,
  locale: Locale = "en",
  emptyState: ReactNode = <p>empty</p>,
  queryClient: QueryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <FeedList
          locale={locale}
          now="2026-09-13T12:00:00.000Z"
          initialPage={initialPage}
          emptyState={emptyState}
        />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

const emptyPoll = (): FeedPage => ({ content: [], nextCursor: undefined, startOver: false });

const advancePoll = (ms = LIVE_POLL_INTERVAL_MS) => act(() => vi.advanceTimersByTimeAsync(ms));

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

describe("FeedList older-history error handling", () => {
  it("offers a retry when loading older history fails transiently, and clears once it succeeds", async () => {
    readOlderFeedAction.mockRejectedValueOnce(apiError("network", "Could not reach the backend"));
    renderList({ content: [line("c1", "alice")], nextCursor: "c1", startOver: false });

    act(() => intersectionObserverInstances[0]!.trigger(true));

    await waitFor(() => expect(screen.getByText("Couldn't load more history.")).toBeInTheDocument());
    expect(
      screen.queryByText("Couldn't load more history — refresh the page to continue."),
    ).not.toBeInTheDocument();
    // Scrolled-to content stays put — no reload happened behind the notice.
    expect(screen.getByRole("link", { name: "alice" })).toBeInTheDocument();

    readOlderFeedAction.mockResolvedValueOnce({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
    act(() => screen.getByRole("button", { name: "Try again" }).click());

    await waitFor(() => expect(screen.getByRole("link", { name: "bob" })).toBeInTheDocument());
    expect(screen.queryByText("Couldn't load more history.")).not.toBeInTheDocument();
  });

  it("offers a page reload instead of a retry once the before cursor no longer verifies, and does not reload on its own", async () => {
    // Resolved, not rejected — see actions.ts's OlderFeedPage comment.
    readOlderFeedAction.mockResolvedValueOnce({
      content: [],
      nextCursor: undefined,
      startOver: false,
      cursorExpired: true,
    });
    const reload = vi.fn();
    const location = vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });
    try {
      renderList({ content: [line("c1", "alice")], nextCursor: "c1", startOver: false });

      act(() => intersectionObserverInstances[0]!.trigger(true));

      await waitFor(() =>
        expect(
          screen.getByText("Couldn't load more history — refresh the page to continue."),
        ).toBeInTheDocument(),
      );
      expect(reload).not.toHaveBeenCalled();
      expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();

      act(() => screen.getByRole("button", { name: "Refresh page" }).click());

      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      location.mockRestore();
    }
  });

  it("shows no older-history notice after a normal successful scroll", async () => {
    readOlderFeedAction.mockResolvedValue({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
    renderList({ content: [line("c1", "alice")], nextCursor: "c1", startOver: false });

    act(() => intersectionObserverInstances[0]!.trigger(true));
    await waitFor(() => expect(screen.getByRole("link", { name: "bob" })).toBeInTheDocument());

    expect(screen.queryByText("Couldn't load more history.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Couldn't load more history — refresh the page to continue."),
    ).not.toBeInTheDocument();
  });

  it("has no accessibility violations while the older-history retry notice is showing", async () => {
    readOlderFeedAction.mockRejectedValueOnce(apiError("network", "Could not reach the backend"));
    const { container } = renderList({ content: [line("c1", "alice")], nextCursor: "c1", startOver: false });

    act(() => intersectionObserverInstances[0]!.trigger(true));
    await waitFor(() => expect(screen.getByText("Couldn't load more history.")).toBeInTheDocument());

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
      renderList(
        { content: [], nextCursor: undefined, startOver: false },
        "en",
        <p>Nothing here yet.</p>,
      );
      expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();

      await advancePoll();

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

  it("never shows the empty state next to the new-events control", async () => {
    pollFeedAction.mockResolvedValue({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      renderList(
        { content: [], nextCursor: undefined, startOver: false },
        "en",
        <p>Nothing here yet.</p>,
      );

      await advancePoll();

      expect(screen.getByRole("button", { name: "1 new event" })).toBeInTheDocument();
      expect(screen.queryByText("Nothing here yet.")).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("can still load older history once a feed that started empty gains its first line", async () => {
    // Every line in the first page resolved to a cellar that isn't public
    // any more, leaving content empty but hasNextPage true from the very
    // first render.
    readOlderFeedAction.mockResolvedValue({
      content: [line("older", "zoe")],
      nextCursor: undefined,
      startOver: false,
    });
    pollFeedAction.mockResolvedValue({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      renderList({ content: [], nextCursor: "c0", startOver: false }, "en", <p>empty</p>);

      await advancePoll();
      act(() => screen.getByRole("button", { name: "1 new event" }).click());
      expect(screen.getByRole("link", { name: "alice" })).toBeInTheDocument();

      expect(screen.getByRole("status")).toBeInTheDocument();
      // async act, not waitFor: waitFor's own retry is real-timer-based and
      // would hang under vi.useFakeTimers(); an async act still flushes the
      // mocked action's microtask-resolved promise before returning.
      await act(async () => {
        intersectionObserverInstances[0]!.trigger(true);
      });

      expect(readOlderFeedAction).toHaveBeenCalledWith("c0");
      expect(screen.getByRole("link", { name: "zoe" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("advances past a batch that came back empty but still carries a cursor", async () => {
    // Every line in this batch resolved to a cellar that isn't public any
    // more — content is empty, but nextCursor says there is more beyond it.
    pollFeedAction.mockResolvedValueOnce({ content: [], nextCursor: "c-skip", startOver: false });
    vi.useFakeTimers();
    try {
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll();
      expect(pollFeedAction).toHaveBeenNthCalledWith(1, "c1");

      pollFeedAction.mockResolvedValueOnce({
        content: [line("c-new", "bob")],
        nextCursor: undefined,
        startOver: false,
      });
      await advancePoll();

      expect(pollFeedAction).toHaveBeenNthCalledWith(2, "c-skip");
      expect(screen.getByRole("button", { name: "1 new event" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("surfaces a new-events control and holds arrivals out of the list until it is activated", async () => {
    pollFeedAction.mockResolvedValue({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
    vi.useFakeTimers();
    try {
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll();

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
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      focusManager.setFocused(false);

      await advancePoll(LIVE_POLL_INTERVAL_MS * 3);
      expect(pollFeedAction).not.toHaveBeenCalled();

      pollFeedAction.mockResolvedValue({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
      await act(async () => {
        focusManager.setFocused(true);
        await vi.advanceTimersByTimeAsync(0);
      });

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
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll();

      // Redelivers c2 alongside a genuinely new c3 (ADR-0060: at-least-once delivery).
      pollFeedAction.mockResolvedValueOnce({
        content: [line("c3", "carol"), line("c2", "bob")],
        nextCursor: undefined,
        startOver: false,
      });
      await advancePoll();

      expect(screen.getByRole("button", { name: "2 new events" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("leaves no hole and no duplicate when a failed poll is followed by a successful one", async () => {
    vi.useFakeTimers();
    try {
      pollFeedAction.mockRejectedValueOnce(new Error("network error"));
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll();

      pollFeedAction.mockResolvedValueOnce({
        content: [line("c2", "bob")],
        nextCursor: undefined,
        startOver: false,
      });
      await advancePoll();

      expect(pollFeedAction).toHaveBeenNthCalledWith(1, "c1");
      expect(pollFeedAction).toHaveBeenNthCalledWith(2, "c1");
      expect(screen.getByRole("button", { name: "1 new event" })).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("reloads instead of retrying once the poll reports startOver", async () => {
    // A since cursor that no longer verifies — most concretely, a backend
    // restart mid-session (actions.ts's pollFeedAction) — has no partial
    // catch-up, unlike a transient failure: only a fresh page recovers it.
    const reload = vi.fn();
    const location = vi.spyOn(window, "location", "get").mockReturnValue({ ...window.location, reload });
    pollFeedAction.mockResolvedValue({ content: [], nextCursor: undefined, startOver: true });
    vi.useFakeTimers();
    try {
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });

      await advancePoll();

      expect(reload).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      location.mockRestore();
    }
  });

  it("surfaces the stalled notice after repeated failures, and a successful poll clears it", async () => {
    vi.useFakeTimers();
    try {
      pollFeedAction.mockRejectedValue(new Error("network error"));
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });

      for (let i = 0; i < STALLED_AFTER_FAILURES - 1; i++) {
        await advancePoll();
      }
      expect(screen.queryByText("Having trouble keeping this up to date.")).not.toBeInTheDocument();

      await advancePoll();
      expect(screen.getByText("Having trouble keeping this up to date.")).toBeInTheDocument();

      pollFeedAction.mockResolvedValue(emptyPoll());
      await act(async () => {
        screen.getByRole("button", { name: "Retry" }).click();
        await vi.advanceTimersByTimeAsync(0);
      });

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
      renderList({ content: [line("c1", "alice")], nextCursor: undefined, startOver: false });
      await advancePoll();

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
      renderList(firstPage);
      expect(screen.getByRole("status")).toBeInTheDocument();

      await advancePoll();
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
      const { container } = renderList({
        content: [line("c1", "alice")],
        nextCursor: undefined,
        startOver: false,
      });
      await advancePoll();
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
      const { container } = renderList(
        { content: [line("c1", "alice")], nextCursor: undefined, startOver: false },
        "fi",
      );
      await advancePoll();
      vi.useRealTimers();

      expect(await axe(container)).toHaveNoViolations();
    } finally {
      vi.useRealTimers();
    }
  });
});

// The app's own QueryClient (app/providers.tsx) is created once and outlives
// a client-side navigation, unlike the fresh one `renderList` makes for every
// other test above — these two share one across an unmount/remount to
// reproduce that.
describe("FeedList remounted on a shared QueryClient", () => {
  it("shows the freshly rendered first page, not a scroll left over from a previous mount", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    readOlderFeedAction.mockResolvedValueOnce({
      content: [line("c-old2", "bob")],
      nextCursor: undefined,
      startOver: false,
    });

    const { unmount } = renderList(
      { content: [line("c-old1", "alice")], nextCursor: "c-old1", startOver: false },
      "en",
      undefined,
      queryClient,
    );
    act(() => intersectionObserverInstances[0]!.trigger(true));
    await waitFor(() => expect(screen.getByRole("link", { name: "bob" })).toBeInTheDocument());
    unmount();

    renderList({ content: [line("c-new", "carol")], nextCursor: undefined, startOver: false }, "en", undefined, queryClient);

    expect(screen.getByRole("link", { name: "carol" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "alice" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "bob" })).not.toBeInTheDocument();
  });

  it("polls from the freshly rendered page's own cursor, not one left rewound by a previous mount", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    vi.useFakeTimers();
    try {
      pollFeedAction.mockResolvedValueOnce({ content: [line("c2", "bob")], nextCursor: undefined, startOver: false });
      const { unmount } = renderList(
        { content: [line("c1", "alice")], nextCursor: undefined, startOver: false },
        "en",
        undefined,
        queryClient,
      );
      await advancePoll();
      expect(pollFeedAction).toHaveBeenNthCalledWith(1, "c1");
      unmount();

      pollFeedAction.mockResolvedValueOnce({ content: [], nextCursor: undefined, startOver: false });
      // The fresh SSR page already reflects carol and dave, which mount 1
      // never polled far enough to see — its own cache entry still holds
      // bob's tick as the newest thing it knows about.
      renderList(
        {
          content: [line("c4", "dave"), line("c3", "carol"), line("c2", "bob"), line("c1", "alice")],
          nextCursor: undefined,
          startOver: false,
        },
        "en",
        undefined,
        queryClient,
      );
      await advancePoll();

      expect(pollFeedAction).toHaveBeenNthCalledWith(2, "c4");
    } finally {
      vi.useRealTimers();
    }
  });
});
