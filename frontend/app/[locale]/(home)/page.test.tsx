import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedPage } from "@/features/feed";
import { apiError } from "@/lib/api/api-error";

const line = (username: string, cursor: string) => ({
  username,
  beerId: "beer-1",
  beerName: "AleSmith IPA",
  brewery: "AleSmith Brewing",
  style: "American IPA",
  abv: 7,
  quantity: 2,
  occurredAt: "2026-09-13T11:56:00.000Z",
  cursor,
});

const { readFeed } = vi.hoisted(() => ({ readFeed: vi.fn() }));
const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
const { listCellarEntries } = vi.hoisted(() => ({ listCellarEntries: vi.fn() }));
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
// FeedList, FeedError, FrontPagePitch, FeedEmptyState and CellarSummary have
// their own tests. These stand-ins record what the page handed them, which is
// the part Home is responsible for; the FeedList one always renders
// `emptyState` so this file can assert on what Home built for it.
const { feedListProps, cellarSummaryProps, pitchProps, emptyStateProps } = vi.hoisted(() => ({
  feedListProps: vi.fn(),
  cellarSummaryProps: vi.fn(),
  pitchProps: vi.fn(),
  emptyStateProps: vi.fn(),
}));

vi.mock("@/features/feed", () => ({
  readFeed,
  FeedList: (props: { emptyState: ReactNode }) => {
    feedListProps(props);
    return <div data-testid="feed-list">{props.emptyState}</div>;
  },
  FeedError: () => <div role="alert">feed failed</div>,
  FrontPagePitch: (props: unknown) => {
    pitchProps(props);
    return <div data-testid="pitch" />;
  },
  FeedEmptyState: (props: unknown) => {
    emptyStateProps(props);
    return <div data-testid="empty-state" />;
  },
  feedHeadingRow: "feed-heading-row",
}));
vi.mock("@/features/cellar", async (importOriginal) => ({
  cellarCounts: (await importOriginal<typeof import("@/features/cellar")>()).cellarCounts,
  listCellarEntries,
  CellarSummary: (props: unknown) => {
    cellarSummaryProps(props);
    return <div data-testid="cellar-summary" />;
  },
}));
vi.mock("@/features/profile/api", () => ({ getProfile }));
// Throws like the real one, so the page never renders past it.
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  redirect,
}));
vi.mock("@/auth", () => ({ auth }));

import Home, { generateMetadata } from "./page";

const params = Promise.resolve({ locale: "en" });
const emptyFeed: FeedPage = { content: [], nextCursor: undefined, startOver: false };
const cellarRow = (beerId: string, bottleCount: number) => ({
  entryId: `entry-${beerId}`,
  beerId,
  beerName: beerId,
  breweryName: "Brewery",
  style: "IPA",
  abv: 6,
  bottles: Array.from({ length: bottleCount }, (_, index) => ({
    id: `${beerId}-${index}`,
    entryId: `entry-${beerId}`,
    containerType: "BOTTLE",
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  })),
});

const signInAs = (username: string, cellarPublic: boolean) => {
  auth.mockResolvedValue({ user: { name: username } });
  getProfile.mockResolvedValue({ username, cellarPublic });
};

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue(null);
  listCellarEntries.mockResolvedValue([]);
});

describe("generateMetadata", () => {
  it("titles the page and serves noindex, nofollow", async () => {
    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("Kalia");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("Home, signed out", () => {
  it("opens on the pitch, not the visitor's cellar", async () => {
    readFeed.mockResolvedValue({ content: [line("ada", "c1")], nextCursor: undefined, startOver: false });

    const { container } = render(await Home({ params }));

    expect(screen.getByTestId("pitch")).toBeInTheDocument();
    expect(pitchProps).toHaveBeenCalledWith({ locale: "en" });
    expect(screen.queryByTestId("cellar-summary")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("hands the feed it read to the feed list under its heading, with no viewer to tag", async () => {
    const page: FeedPage = {
      content: [line("newer-user", "c2"), line("older-user", "c1")],
      nextCursor: undefined,
      startOver: false,
    };
    readFeed.mockResolvedValue(page);

    render(await Home({ params }));

    expect(screen.getByRole("heading", { level: 2, name: "Latest additions" })).toBeInTheDocument();
    expect(feedListProps).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", initialPage: page, viewerUsername: undefined }),
    );
  });

  it("hands the feed an empty state for a visitor with no account", async () => {
    readFeed.mockResolvedValue(emptyFeed);

    render(await Home({ params }));

    expect(emptyStateProps).toHaveBeenCalledWith({ locale: "en", signedIn: false, viewer: null });
  });
});

describe("Home, signed in", () => {
  it("replaces the pitch with the visitor's cellar and keeps a heading for the page", async () => {
    readFeed.mockResolvedValue({ content: [line("ada", "c1")], nextCursor: undefined, startOver: false });
    signInAs("ada", true);
    listCellarEntries.mockResolvedValue([cellarRow("kbs", 3), cellarRow("orval", 4)]);

    render(await Home({ params }));

    expect(screen.getByRole("heading", { level: 1, name: "Kalia" })).toHaveClass("sr-only");
    expect(screen.queryByTestId("pitch")).not.toBeInTheDocument();
    expect(cellarSummaryProps).toHaveBeenCalledWith({
      locale: "en",
      cellarPublic: true,
      counts: { bottles: 7, beers: 2 },
    });
    expect(feedListProps).toHaveBeenCalledWith(expect.objectContaining({ viewerUsername: "ada" }));
  });

  it("still shows the cellar, without figures, when the cellar cannot be read", async () => {
    readFeed.mockResolvedValue(emptyFeed);
    signInAs("ada", true);
    listCellarEntries.mockRejectedValue(apiError("network", "could not reach the backend"));

    render(await Home({ params }));

    expect(cellarSummaryProps).toHaveBeenCalledWith(expect.objectContaining({ counts: null }));
  });

  it("hands the feed an empty state that knows the visitor and whether their cellar is public", async () => {
    readFeed.mockResolvedValue(emptyFeed);
    signInAs("ada", false);

    render(await Home({ params }));

    expect(emptyStateProps).toHaveBeenCalledWith({
      locale: "en",
      signedIn: true,
      viewer: expect.objectContaining({ cellarPublic: false }),
    });
  });

  // Where a new account lands after registering, so where it learns the name is taken.
  it("sends a visitor whose username another account holds to the page that says so", async () => {
    readFeed.mockResolvedValue(emptyFeed);
    auth.mockResolvedValue({ user: { name: "ada" } });
    getProfile.mockRejectedValue(apiError("http", "status 409", { status: 409 }));

    await expect(Home({ params })).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/en/username-taken");
  });
});

describe("Home, when the feed cannot be read", () => {
  it("keeps the masthead and shows the failure where the feed would be, instead of the route's error page", async () => {
    readFeed.mockRejectedValue(apiError("network", "could not reach the backend"));

    const { container } = render(await Home({ params }));

    expect(screen.getByTestId("pitch")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Latest additions" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("feed failed");
    expect(screen.queryByTestId("feed-list")).not.toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
