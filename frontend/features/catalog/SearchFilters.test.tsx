import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SearchFilters } from "./SearchFilters";

describe("SearchFilters", () => {
  it("renders labeled filter controls prefilled from current params", () => {
    render(
      <SearchFilters
        params={{ query: "ipa", style: "IPA", country: "Finland", minAbv: "4", maxAbv: "8" }}
      />,
    );

    expect(screen.getByLabelText(/search/i)).toHaveValue("ipa");
    expect(screen.getByLabelText(/style/i)).toHaveValue("IPA");
    expect(screen.getByLabelText(/country/i)).toHaveValue("Finland");
    expect(screen.getByLabelText(/min.*abv/i)).toHaveValue(4);
    expect(screen.getByLabelText(/max.*abv/i)).toHaveValue(8);
    expect(screen.getByRole("button", { name: /search/i })).toBeInTheDocument();
  });

  it("submits as GET to /beers so the URL carries the filters", () => {
    render(<SearchFilters params={{}} />);

    const form = screen.getByRole("search");
    expect(form).toHaveAttribute("action", "/beers");
    expect(form).toHaveAttribute("method", "get");
  });
});
