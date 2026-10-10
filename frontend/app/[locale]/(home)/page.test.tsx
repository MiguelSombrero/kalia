import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FeedPage } from "@/features/feed";
import { apiError } from "@/lib/api/api-error";

const line = (username: string, cursor: string) => ({
  username,
  beerName: "AleSmith IPA",
  brewery: "AleSmith Brewing",
  quantity: 2,
  occurredAt: "2026-09-13T11:56:00.000Z",
  cursor,
});

const { readFeed } = vi.hoisted(() => ({ readFeed: vi.fn() }));
const { getProfile } = vi.hoisted(() => ({ getProfile: vi.fn() }));
const { listCellarEntries } = vi.hoisted(() => ({ listCellarEntries: vi.fn() }));
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
// FeedList, FeedError and CellarSummary are client components with their own
// tests. These stand-ins record what the page handed them, which is the part
// Home is responsible for; the FeedList one always renders `emptyState` so
// this file can assert on what Home built for it.
const { feedListProps, cellarSummaryProps } = vi.hoisted(() => ({
  feedListProps: vi.fn(),
  cellarSummaryProps: vi.fn(),
}));

vi.mock("@/features/feed", () => ({
  readFeed,
  FeedList: (props: { emptyState: ReactNode }) => {
    feedListProps(props);
    return <div data-testid="feed-list">{props.emptyState}</div>;
  },
  FeedError: () => <div role="alert">feed failed</div>,
}));
vi.mock("@/features/cellar", () => ({
  listCellarEntries,
  CellarSummary: (props: unknown) => {
    cellarSummaryProps(props);
    return <div data-testid="cellar-summary" />;
  },
}));
vi.mock("@/features/profile", () => ({ getProfile }));
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
  it("opens on the tagline as its heading, what the feed is, and how Kalia works", async () => {
    readFeed.mockResolvedValue({ content: [line("ada", "c1")], nextCursor: undefined, startOver: false });

    const { container } = render(await Home({ params }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Craft beer management for enthusiasts." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This is where cellars people have chosen to make public show what they're adding."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "How Kalia works" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "01Find a beerSearch the catalog.",
      "02Cellar itCount every bottle and note its vintage.",
      "03Share itMake your cellar public and your additions appear here.",
    ]);
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

  it("builds an empty state that invites creating an account and does not repeat the pitch", async () => {
    readFeed.mockResolvedValue(emptyFeed);

    const { container } = render(await Home({ params }));

    const empty = screen.getByTestId("feed-list");
    expect(empty).toHaveTextContent("Nothing here yet.");
    expect(empty).not.toHaveTextContent("This is where cellars people have chosen");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/sign-up");
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("Home, signed in", () => {
  it("replaces the pitch with the visitor's cellar and keeps a heading for the page", async () => {
    readFeed.mockResolvedValue({ content: [line("ada", "c1")], nextCursor: undefined, startOver: false });
    signInAs("ada", true);
    listCellarEntries.mockResolvedValue([cellarRow("kbs", 3), cellarRow("orval", 4)]);

    render(await Home({ params }));

    expect(screen.getByRole("heading", { level: 1, name: "Kalia" })).toHaveClass("sr-only");
    expect(screen.queryByRole("heading", { name: "How Kalia works" })).not.toBeInTheDocument();
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

  it("explains an empty feed, and why the visitor's own additions are missing when their cellar is private", async () => {
    readFeed.mockResolvedValue(emptyFeed);
    signInAs("ada", false);

    render(await Home({ params }));

    const empty = screen.getByTestId("feed-list");
    expect(empty).toHaveTextContent("This is where cellars people have chosen to make public");
    expect(empty).toHaveTextContent("Your own cellar is private, so your additions won't show up here.");
    expect(screen.getByRole("link", { name: "Make your cellar public" })).toHaveAttribute(
      "href",
      "/en/profile",
    );
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("does not show the private-cellar hint when the visitor's cellar is already public", async () => {
    readFeed.mockResolvedValue(emptyFeed);
    signInAs("ada", true);

    render(await Home({ params }));

    expect(
      screen.queryByText("Your own cellar is private, so your additions won't show up here."),
    ).not.toBeInTheDocument();
  });
});

describe("Home, when the feed cannot be read", () => {
  it("keeps the masthead and shows the failure where the feed would be, instead of the route's error page", async () => {
    readFeed.mockRejectedValue(apiError("network", "could not reach the backend"));

    const { container } = render(await Home({ params }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Craft beer management for enthusiasts." }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Latest additions" })).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("feed failed");
    expect(screen.queryByTestId("feed-list")).not.toBeInTheDocument();
    expect(screen.queryByText("Something went wrong")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
