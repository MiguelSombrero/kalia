import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

const { headers } = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("next/headers", () => ({ headers }));

import BeerNotFound from "./not-found";

describe("BeerNotFound", () => {
  it("is the catalog's own page, titled like the others, with a way back to the catalog", async () => {
    headers.mockResolvedValue(new Headers({ "x-pathname": "/en/beers/no-such-beer" }));

    const { container } = render(await BeerNotFound());

    const heading = screen.getByRole("heading", { level: 1, name: "Beer not found" });
    expect(heading.className).toContain("md:text-display");
    expect(screen.getByRole("link", { name: "Back to the catalog" })).toHaveAttribute("href", "/en/beers");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in the locale from the request path", async () => {
    headers.mockResolvedValue(new Headers({ "x-pathname": "/fi/beers/no-such-beer" }));

    render(await BeerNotFound());

    expect(screen.getByRole("heading", { level: 1, name: "Olutta ei löytynyt" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Takaisin tarjontaan" })).toHaveAttribute("href", "/fi/beers");
  });
});
