import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { FrontPagePitch } from "./FrontPagePitch";

describe("FrontPagePitch", () => {
  it("opens on the tagline as its heading, what the feed is, and how Kalia works", async () => {
    const { container } = render(await FrontPagePitch({ locale: "en" }));

    expect(
      screen.getByRole("heading", { level: 1, name: "Craft beer management for enthusiasts." }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("This is where cellars people have chosen to make public show what they're adding."),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "How Kalia works" })).toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "01Find a beerSearch the catalog.",
      "02Cellar itCount every bottle and note its vintage.",
      "03Share itMake your cellar public and your additions appear here.",
    ]);
    expect(await axe(container)).toHaveNoViolations();
  });
});
