import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

const { headers } = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("next/headers", () => ({ headers }));

import LocaleNotFound from "./not-found";

describe("LocaleNotFound", () => {
  it("says only that the page was not found — nothing about what was missing", async () => {
    headers.mockResolvedValue(new Headers({ "x-pathname": "/en/cellars/testuser" }));

    const { container } = render(await LocaleNotFound());

    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeInTheDocument();
    expect(screen.getByText("This page does not exist.")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/private|cellar|testuser/i);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders in the locale from the request path", async () => {
    headers.mockResolvedValue(new Headers({ "x-pathname": "/fi/cellars/testuser" }));

    render(await LocaleNotFound());

    expect(screen.getByRole("heading", { level: 1, name: "Sivua ei löytynyt" })).toBeInTheDocument();
  });
});
