import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { Pagination } from "./Pagination";
import type { BeerPage } from "./types";

const midPage: BeerPage = { content: [], totalElements: 42, totalPages: 3, page: 1 };

const findElementTypes = (node: unknown): unknown[] => {
  if (Array.isArray(node)) {
    return node.flatMap(findElementTypes);
  }
  if (!node || typeof node !== "object") {
    return [];
  }
  const element = node as { type?: unknown; props?: { children?: unknown } };
  return [element.type, ...findElementTypes(element.props?.children)];
};

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

  // Asserts an implementation detail on purpose — do not delete. Swapping
  // these anchors back to next/link breaks pagination in production builds
  // only, which no test against a dev server or a rendered DOM can see.
  // See Pagination.tsx.
  it("uses plain anchors, since next/link does not navigate on query-only changes", async () => {
    const types = findElementTypes(await Pagination({ locale: "en", params: {}, result: midPage }));

    expect(types.filter((type) => type === "a")).toHaveLength(2);
    expect(types.every((type) => typeof type !== "function")).toBe(true);
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
