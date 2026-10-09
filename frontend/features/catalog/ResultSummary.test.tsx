import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { ResultSummary } from "./ResultSummary";

describe("ResultSummary", () => {
  it.each([
    ["en", 1, "1 beer"],
    ["en", 54, "54 beers"],
    ["fi", 1, "1 olut"],
    ["fi", 54, "54 olutta"],
  ] as const)("in %s, counts %i result(s) as “%s”", async (locale, count, text) => {
    render(await ResultSummary({ locale, params: {}, totalElements: count }));

    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it("lists each active filter as a link that removes only it, and offers to clear them all", async () => {
    const { container } = render(
      await ResultSummary({
        locale: "en",
        params: { query: "abt", country: "Belgium", minAbv: "8", sort: "abv,desc", page: "2" },
        totalElements: 2,
      }),
    );

    expect(screen.getByRole("link", { name: "Remove filter: “abt”" })).toHaveAttribute(
      "href",
      "/en/beers?country=Belgium&minAbv=8&sort=abv%2Cdesc",
    );
    expect(screen.getByRole("link", { name: "Remove filter: Belgium" })).toHaveAttribute(
      "href",
      "/en/beers?query=abt&minAbv=8&sort=abv%2Cdesc",
    );
    expect(screen.getByRole("link", { name: "Remove filter: at least 8\u00a0%" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear all" })).toHaveAttribute("href", "/en/beers");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows only the count when nothing is filtered", async () => {
    render(await ResultSummary({ locale: "fi", params: { sort: "name,desc" }, totalElements: 54 }));

    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("writes the strength bounds in Finnish", async () => {
    render(await ResultSummary({ locale: "fi", params: { maxAbv: "5.5" }, totalElements: 9 }));

    expect(screen.getByRole("link", { name: "Poista suodatin: enintään 5,5\u00a0%" })).toBeInTheDocument();
  });

  it("quotes the name search the way each language does", async () => {
    render(await ResultSummary({ locale: "fi", params: { query: "abt" }, totalElements: 1 }));

    expect(screen.getByRole("link", { name: "Poista suodatin: ”abt”" })).toBeInTheDocument();
  });
});
