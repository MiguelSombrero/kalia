import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Pagination } from "./Pagination";
import type { BeerPage } from "./types";

const midPage: BeerPage = { content: [], totalElements: 42, totalPages: 3, page: 1 };

describe("Pagination", () => {
  it("renders both Previous and Next on a middle page, with an accessible summary", async () => {
    const { container } = render(
      await Pagination({ locale: "en", params: {}, result: midPage }),
    );

    expect(screen.getByRole("navigation", { name: "Pagination" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "href",
      "/en/beers?page=0",
    );
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      "/en/beers?page=2",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders nothing for a single-page result", async () => {
    const ui = await Pagination({
      locale: "en",
      params: {},
      result: { content: [], totalElements: 3, totalPages: 1, page: 0 },
    });

    expect(ui).toBeNull();
  });
});
