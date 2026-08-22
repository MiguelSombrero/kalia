import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ startCellarSignIn: vi.fn() }));
vi.mock("./AddBottleDialog", () => ({
  AddBottleDialog: ({ beerId }: { beerId: string }) => <div data-testid="dialog">{beerId}</div>,
}));

import { AddToCellarButton } from "./AddToCellarButton";

const props = {
  beerId: "3f4d2c1a-0000-4000-8000-000000000001",
  beerName: "Westvleteren 12",
};

describe("AddToCellarButton", () => {
  it("offers the dialog to a signed-in visitor", async () => {
    render(await AddToCellarButton({ locale: "en", isSignedIn: true, ...props }));

    expect(screen.getByTestId("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Add to cellar" })).not.toBeInTheDocument();
  });

  it("sends a signed-out visitor through sign-in instead of showing the dialog", async () => {
    const { container } = render(
      await AddToCellarButton({ locale: "en", isSignedIn: false, ...props }),
    );

    expect(screen.queryByTestId("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add to cellar" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  // The action rebuilds the return path from these two fields, so a missing
  // one silently drops the visitor somewhere other than the beer they clicked.
  it("carries the beer and locale the sign-in should return to", async () => {
    const { container } = render(
      await AddToCellarButton({ locale: "fi", isSignedIn: false, ...props }),
    );

    expect(container.querySelector('input[name="beerId"]')).toHaveValue(props.beerId);
    expect(container.querySelector('input[name="locale"]')).toHaveValue("fi");
  });

  it("renders signed-out in Finnish with no a11y violations", async () => {
    const { container } = render(
      await AddToCellarButton({ locale: "fi", isSignedIn: false, ...props }),
    );

    expect(screen.getByRole("button", { name: "Lisää kellariin" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
