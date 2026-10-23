import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SearchFilters } from "./SearchFilters";

const countryCodes = ["SE", "DE", "AT", "FI"];

const countryOptions = (select: HTMLElement) =>
  Array.from(select.querySelectorAll("option")).map((option) => [option.value, option.textContent]);

describe("SearchFilters", () => {
  it("offers the catalog's countries by code, named and sorted in the reader's language", async () => {
    render(await SearchFilters({ locale: "en", params: {}, countryCodes }));
    expect(countryOptions(screen.getByLabelText("Country"))).toEqual([
      ["", "All countries"],
      ["AT", "Austria"],
      ["FI", "Finland"],
      ["DE", "Germany"],
      ["SE", "Sweden"],
    ]);
    expect(screen.getByLabelText("Country")).toHaveValue("");
  });

  it("names and sorts the countries in Finnish for a Finnish reader", async () => {
    render(await SearchFilters({ locale: "fi", params: { countryCode: "SE" }, countryCodes }));
    expect(countryOptions(screen.getByLabelText("Maa"))).toEqual([
      ["", "Kaikki maat"],
      ["AT", "Itävalta"],
      ["SE", "Ruotsi"],
      ["DE", "Saksa"],
      ["FI", "Suomi"],
    ]);
    expect(screen.getByLabelText("Maa")).toHaveValue("SE");
  });

  it("renders labeled filter controls prefilled from current params", async () => {
    const { container } = render(
      await SearchFilters({
        locale: "en",
        params: { query: "ipa", style: "IPA", countryCode: "FI", minAbv: "4", maxAbv: "8" },
        countryCodes,
      }),
    );

    expect(screen.getByLabelText("Search")).toHaveValue("ipa");
    expect(screen.getByLabelText("Style")).toHaveValue("IPA");
    expect(screen.getByLabelText("Country")).toHaveValue("FI");
    expect(screen.getByRole("spinbutton", { name: "Min ABV %" })).toHaveValue(4);
    expect(screen.getByRole("spinbutton", { name: "Max ABV %" })).toHaveValue(8);
    expect(screen.getByRole("group", { name: "Strength %" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("cannot send a text over 100 characters or an ABV over 100, which the search API refuses", async () => {
    render(await SearchFilters({ locale: "en", params: {}, countryCodes }));

    expect(screen.getByLabelText("Search")).toHaveAttribute("maxlength", "100");
    expect(screen.getByLabelText("Style")).toHaveAttribute("maxlength", "100");
    expect(screen.getByRole("spinbutton", { name: "Min ABV %" })).toHaveAttribute("max", "100");
    expect(screen.getByRole("spinbutton", { name: "Max ABV %" })).toHaveAttribute("max", "100");
  });

  // ADR-0069: one button, after every field, so where it sits says that it
  // sends the name and the folded filters alike.
  it("has exactly one submit button, and it comes after every field, folded ones included", async () => {
    const { container } = render(await SearchFilters({ locale: "en", params: {}, countryCodes }));

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
      await SearchFilters({ locale: "en", params: { query: "ipa", countryCode: "FI", sort: "abv,desc" }, countryCodes }),
    );

    const details = container.querySelector("details");
    expect(details).not.toBeNull();
    expect(details).not.toHaveAttribute("open");
    expect(details?.querySelector("summary")).toHaveTextContent("Filters · 2");
    expect(details?.querySelector("#query")).toBeNull();
    for (const id of ["style", "countryCode", "minAbv", "maxAbv", "sort"]) {
      expect(details?.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("offers Clear all only while something is searched for, as a plain anchor", async () => {
    const { unmount } = render(await SearchFilters({ locale: "en", params: { sort: "name,asc", page: "1" }, countryCodes }));
    expect(screen.queryByRole("link", { name: "Clear all" })).not.toBeInTheDocument();
    unmount();

    const { container } = render(await SearchFilters({ locale: "en", params: { style: "IPA" }, countryCodes }));
    expect(container.querySelector('a[href="/en/beers"]')).toHaveTextContent("Clear all");
  });

  it("submits as GET to the locale-prefixed catalog URL", async () => {
    render(await SearchFilters({ locale: "en", params: {}, countryCodes }));

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/en/beers");
    expect(form).toHaveAttribute("method", "get");
  });

  it("renders Finnish labels and submits to the Finnish catalog URL", async () => {
    const { container } = render(await SearchFilters({ locale: "fi", params: {}, countryCodes }));

    expect(screen.getByLabelText("Haku")).toBeInTheDocument();
    expect(screen.getByLabelText("Tyyli")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hae" })).toBeInTheDocument();
    expect(container.querySelector("summary")).toHaveTextContent("Suodattimet");
    expect(screen.getByRole("search")).toHaveAttribute("action", "/fi/beers");
    expect(await axe(container)).toHaveNoViolations();
  });
});
