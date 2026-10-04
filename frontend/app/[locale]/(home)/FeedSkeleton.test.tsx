import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { feedRowFrame } from "@/features/feed";
import { FEED_SKELETON_ROWS, FeedSkeleton } from "./FeedSkeleton";
import { feedHeadingRow, mastheadGrid } from "./frontPageLayout";

describe("FeedSkeleton", () => {
  it("renders an accessible loading status with no a11y violations", async () => {
    const { container } = render(await FeedSkeleton({ locale: "en" }));

    expect(screen.getByRole("status", { name: "Loading recent activity…" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the Finnish loading label with no a11y violations", async () => {
    const { container } = render(await FeedSkeleton({ locale: "fi" }));

    expect(
      screen.getByRole("status", { name: "Ladataan viimeaikaista toimintaa…" }),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("draws its rows on a feed entry's own frame, each with the person slot's square, three lines and a count", async () => {
    const { container } = render(await FeedSkeleton({ locale: "en" }));

    const rows = container.querySelectorAll("li");
    expect(rows).toHaveLength(FEED_SKELETON_ROWS);
    for (const row of rows) {
      expect(row.className).toBe(feedRowFrame);
      const [slot, lines, count] = Array.from(row.children);
      expect(slot.className).toContain("size-9");
      expect(lines.children).toHaveLength(3);
      expect(count.className).toContain("self-center");
    }
  });

  it("draws the feed's heading row under the masthead's shape, as the page lays them out", async () => {
    const { container } = render(await FeedSkeleton({ locale: "en" }));

    const status = screen.getByRole("status");
    const [masthead, feed] = Array.from(status.children);
    expect(masthead.firstElementChild?.className).toBe(mastheadGrid);
    expect(feed.firstElementChild?.className).toBe(feedHeadingRow);
    expect(container.querySelector("ul")?.parentElement).toBe(feed);
  });
});
