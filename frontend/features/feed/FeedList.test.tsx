import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";
import type { FeedPage } from "./types";

const { readOlderFeedAction } = vi.hoisted(() => ({ readOlderFeedAction: vi.fn() }));
vi.mock("./actions", () => ({ readOlderFeedAction }));

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

const renderList = (initialPage: FeedPage, locale: Locale = "en") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <FeedList locale={locale} now="2026-09-13T12:00:00.000Z" initialPage={initialPage} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  readOlderFeedAction.mockReset();
  intersectionObserverInstances.length = 0;
  sentinelIsIntersecting = false;
  vi.stubGlobal("IntersectionObserver", IntersectionObserverMock);
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
