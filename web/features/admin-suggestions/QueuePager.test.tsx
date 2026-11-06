import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { QueuePager } from "./QueuePager";

describe("QueuePager", () => {
  it("links to the previous and next pages of a queue longer than a page, one-based in the URL", async () => {
    const { container } = render(await QueuePager({ locale: "en", page: 1, totalPages: 3 }));

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/en/admin?page=1");
    expect(screen.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/en/admin?page=3");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers no Previous on the first page and no Next on the last", async () => {
    const { rerender } = render(await QueuePager({ locale: "fi", page: 0, totalPages: 2 }));
    expect(screen.queryByRole("link", { name: "Edellinen" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Seuraava" })).toHaveAttribute("href", "/fi/admin?page=2");

    rerender(await QueuePager({ locale: "fi", page: 1, totalPages: 2 }));
    expect(screen.queryByRole("link", { name: "Seuraava" })).not.toBeInTheDocument();
  });

  it("renders nothing for a queue of one page", async () => {
    expect(await QueuePager({ locale: "en", page: 0, totalPages: 1 })).toBeNull();
  });

  // Asserts an implementation detail on purpose — do not delete: next/link on a
  // query-only change does not commit in production builds (web/README.md).
  it("uses plain anchors", async () => {
    const { container } = render(await QueuePager({ locale: "en", page: 0, totalPages: 2 }));

    expect(container.querySelector("a")).not.toBeNull();
    expect(JSON.stringify(await QueuePager({ locale: "en", page: 0, totalPages: 2 }))).not.toContain("next/link");
  });
});
