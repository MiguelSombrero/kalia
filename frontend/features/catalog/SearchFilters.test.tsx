import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SearchFilters } from "./SearchFilters";

describe("SearchFilters", () => {
  it("renders labeled filter controls prefilled from current params", async () => {
    const { container } = render(
      await SearchFilters({
        locale: "en",
        params: { query: "ipa", style: "IPA", country: "Finland", minAbv: "4", maxAbv: "8" },
      }),
    );

    expect(screen.getByLabelText("Search")).toHaveValue("ipa");
    expect(screen.getByLabelText("Style")).toHaveValue("IPA");
    expect(screen.getByLabelText("Country")).toHaveValue("Finland");
    expect(screen.getByRole("spinbutton", { name: "Min ABV %" })).toHaveValue(4);
    expect(screen.getByRole("spinbutton", { name: "Max ABV %" })).toHaveValue(8);
    expect(screen.getByRole("group", { name: "Strength %" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  // ADR-0069: one button, after every field, so where it sits says that it
  // sends the name and the folded filters alike.
  it("has exactly one submit button, and it comes after every field, folded ones included", async () => {
    const { container } = render(await SearchFilters({ locale: "en", params: {} }));

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName("Search");
    expect(buttons[0]).toHaveAttribute("type", "submit");
    const fields = container.querySelectorAll("input, select");
    const lastField = fields[fields.length - 1];
    expect(lastField.compareDocumentPosition(buttons[0]) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(buttons[0].closest("details")).toBeNull();
  });

  it("folds everything but the name search behind a disclosure that counts what is set", async () => {
    const { container } = render(
      await SearchFilters({ locale: "en", params: { query: "ipa", country: "Finland", sort: "abv,desc" } }),
    );

    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details?.querySelector("summary")).toHaveTextContent("Filters · 2");
    expect(details?.querySelector("#query")).toBeNull();
    for (const id of ["style", "country", "minAbv", "maxAbv", "sort"]) {
      expect(details?.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("offers Clear all only while something is searched for, as a plain anchor", async () => {
    const { unmount } = render(await SearchFilters({ locale: "en", params: { sort: "name,asc", page: "1" } }));
    expect(screen.queryByRole("link", { name: "Clear all" })).not.toBeInTheDocument();
    unmount();

    const { container } = render(await SearchFilters({ locale: "en", params: { style: "IPA" } }));
    expect(container.querySelector('a[href="/en/beers"]')).toHaveTextContent("Clear all");
  });

  it("submits as GET to the locale-prefixed catalog URL", async () => {
    render(await SearchFilters({ locale: "en", params: {} }));

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/en/beers");
    expect(form).toHaveAttribute("method", "get");
  });

  it("renders Finnish labels and submits to the Finnish catalog URL", async () => {
    const { container } = render(await SearchFilters({ locale: "fi", params: {} }));

    expect(screen.getByLabelText("Haku")).toBeInTheDocument();
    expect(screen.getByLabelText("Tyyli")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hae" })).toBeInTheDocument();
    expect(container.querySelector("summary")).toHaveTextContent("Suodattimet");
    expect(screen.getByRole("search")).toHaveAttribute("action", "/fi/beers");
    expect(await axe(container)).toHaveNoViolations();
  });
});
