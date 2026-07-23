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

    expect(screen.getByLabelText(/search/i)).toHaveValue("ipa");
    expect(screen.getByLabelText(/style/i)).toHaveValue("IPA");
    expect(screen.getByLabelText(/country/i)).toHaveValue("Finland");
    expect(screen.getByLabelText(/min.*abv/i)).toHaveValue(4);
    expect(screen.getByLabelText(/max.*abv/i)).toHaveValue(8);
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("submits as GET to the locale-prefixed catalog URL", async () => {
    render(await SearchFilters({ locale: "en", params: {} }));

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/en/beers");
    expect(form).toHaveAttribute("method", "get");
  });

  it("renders Finnish labels and submits to the Finnish catalog URL", async () => {
    render(await SearchFilters({ locale: "fi", params: {} }));

    expect(screen.getByLabelText("Haku")).toBeInTheDocument();
    expect(screen.getByLabelText("Tyyli")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hae" })).toBeInTheDocument();
    expect(screen.getByRole("search")).toHaveAttribute("action", "/fi/beers");
  });
});
