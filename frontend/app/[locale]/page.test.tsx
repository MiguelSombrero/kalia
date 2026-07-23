import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("shows the Kalia heading and links to the English catalog", async () => {
    const ui = await Home({ params: Promise.resolve({ locale: "en" }) });
    const { container } = render(ui);

    expect(
      screen.getByRole("heading", { level: 1, name: /kalia/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /browse the beer catalog/i })).toHaveAttribute(
      "href",
      "/en/beers",
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows the Finnish tagline and links to the Finnish catalog", async () => {
    const ui = await Home({ params: Promise.resolve({ locale: "fi" }) });
    render(ui);

    expect(screen.getByText("Käsityöoluiden hallintaa olutharrastajille.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Selaa oluita" })).toHaveAttribute(
      "href",
      "/fi/beers",
    );
  });
});
