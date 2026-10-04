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
const { auth } = vi.hoisted(() => ({ auth: vi.fn() }));
// FeedList is a client component with its own test, including which of
// `emptyState` or the list it renders — this stands in for it, records what
// the page handed it (which is the part Home is responsible for), and always
// renders `emptyState` so this file can assert on what Home built for it.
const { feedListProps } = vi.hoisted(() => ({ feedListProps: vi.fn() }));

vi.mock("@/features/feed", () => ({
  readFeed,
  FeedList: (props: { emptyState: ReactNode }) => {
    feedListProps(props);
    return <div data-testid="feed-list">{props.emptyState}</div>;
  },
}));
vi.mock("@/features/profile", () => ({ getProfile }));
vi.mock("@/auth", () => ({ auth }));

import Home, { generateMetadata } from "./page";

const params = Promise.resolve({ locale: "en" });

beforeEach(() => {
  vi.clearAllMocks();
  auth.mockResolvedValue(null);
});

describe("generateMetadata", () => {
  it("titles the page and serves noindex, nofollow", async () => {
    const metadata = await generateMetadata({ params });

    expect(metadata.title).toBe("Kalia");
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});

describe("Home", () => {
  it("hands the feed it read to the feed list", async () => {
    const page: FeedPage = {
      content: [line("newer-user", "c2"), line("older-user", "c1")],
      nextCursor: undefined,
      startOver: false,
    };
    readFeed.mockResolvedValue(page);

    const { container } = render(await Home({ params }));

    expect(screen.getByText("Kalia")).toBeInTheDocument();
    expect(screen.getByTestId("feed-list")).toBeInTheDocument();
    expect(feedListProps).toHaveBeenCalledWith(
      expect.objectContaining({ locale: "en", initialPage: page }),
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("builds the empty state for a signed-out visitor, with no private-cellar hint", async () => {
    readFeed.mockResolvedValue({ content: [], nextCursor: undefined, startOver: false });

    const { container } = render(await Home({ params }));

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(
      screen.queryByText("Your own cellar is private, so your additions won't show up here."),
    ).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("builds a differing empty state for a signed-in visitor whose own cellar is private", async () => {
    readFeed.mockResolvedValue({ content: [], nextCursor: undefined, startOver: false });
    auth.mockResolvedValue({ user: { name: "Ada" } });
    getProfile.mockResolvedValue({ username: "ada", cellarPublic: false });

    render(await Home({ params }));

    expect(screen.getByText("Nothing here yet.")).toBeInTheDocument();
    expect(
      screen.getByText("Your own cellar is private, so your additions won't show up here."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make your cellar public" })).toHaveAttribute(
      "href",
      "/en/profile",
    );
  });

  it("does not show the private-cellar hint to a signed-in visitor whose cellar is already public", async () => {
    readFeed.mockResolvedValue({ content: [], nextCursor: undefined, startOver: false });
    auth.mockResolvedValue({ user: { name: "Ada" } });
    getProfile.mockResolvedValue({ username: "ada", cellarPublic: true });

    render(await Home({ params }));

    expect(
      screen.queryByText("Your own cellar is private, so your additions won't show up here."),
    ).not.toBeInTheDocument();
  });

  it("propagates a feed read failure to the app's error boundary", async () => {
    readFeed.mockRejectedValue(apiError("network", "could not reach the backend"));

    await expect(Home({ params })).rejects.toThrow();
  });
});
