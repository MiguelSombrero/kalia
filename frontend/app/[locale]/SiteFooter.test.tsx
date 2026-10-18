import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("carries the mark and the tagline in the locale, and no control", async () => {
    const { container } = render(await SiteFooter({ locale: "fi" }));

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText("Käsityöoluiden hallintaa olutharrastajille.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector("footer svg")).toHaveAttribute("aria-hidden", "true");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each([
    ["en", "Beer data includes facts from Wikidata (CC0).", "Wikidata"],
    ["fi", "Oluttiedoissa on Wikidatan tietoja (CC0).", "Wikidatan"],
  ] as const)("credits Wikidata in %s with its one link, to wikidata.org itself", async (locale, credit, linkText) => {
    render(await SiteFooter({ locale }));

    expect(screen.getByText((_, element) => element?.tagName === "P" && element.textContent === credit)).toBeInTheDocument();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAccessibleName(linkText);
    expect(links[0]).toHaveAttribute("href", "https://www.wikidata.org/");
  });
});
