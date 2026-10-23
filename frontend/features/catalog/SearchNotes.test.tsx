import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { IgnoredFilterNote, isPastLastPage, PastLastPage } from "./SearchNotes";
import type { BeerPage } from "./types";

const pastLast: BeerPage = { content: [], totalElements: 42, totalPages: 3, page: 40 };

describe("IgnoredFilterNote", () => {
  it.each([
    ["en", "A filter in this search wasn't valid, so it was ignored."],
    ["fi", "Virheellinen hakuehto jätettiin huomiotta."],
  ] as const)("says in %s that a filter was ignored", async (locale, text) => {
    const { container } = render(await IgnoredFilterNote({ locale }));

    expect(screen.getByText(text)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("isPastLastPage", () => {
  it("holds only for an empty page of a search that matched beers", () => {
    expect(isPastLastPage(pastLast)).toBe(true);
    expect(isPastLastPage({ ...pastLast, totalElements: 0, totalPages: 0 })).toBe(false);
  });
});

describe("PastLastPage", () => {
  it("names the missing page and links back to page 1 of the same search", async () => {
    const { container } = render(
      await PastLastPage({ locale: "en", params: { query: "ipa", page: "40" }, result: pastLast }),
    );

    expect(screen.getByRole("heading", { name: "This search has no page 41." })).toBeInTheDocument();
    expect(screen.getByText("It has only 3 pages.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Back to page 1" })).toHaveAttribute("href", "/en/beers?query=ipa");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says so in Finnish", async () => {
    render(await PastLastPage({ locale: "fi", params: {}, result: { ...pastLast, totalPages: 1 } }));

    expect(screen.getByRole("heading", { name: "Tällä haulla ei ole sivua 41." })).toBeInTheDocument();
    expect(screen.getByText("Sillä on vain 1 sivu.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Takaisin sivulle 1" })).toHaveAttribute("href", "/fi/beers");
  });
});
