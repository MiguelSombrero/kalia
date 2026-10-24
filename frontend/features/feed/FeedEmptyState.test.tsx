import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { FeedEmptyState } from "./FeedEmptyState";

describe("FeedEmptyState", () => {
  it("invites a visitor with no account to create one and does not repeat the pitch", async () => {
    const { container } = render(await FeedEmptyState({ locale: "en", signedIn: false, viewer: null }));

    expect(container).toHaveTextContent("Nothing here yet.");
    expect(container).not.toHaveTextContent("This is where cellars people have chosen");
    expect(screen.getByRole("link", { name: "Create an account" })).toHaveAttribute("href", "/en/sign-up");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("explains an empty feed, and why the viewer's own additions are missing when their cellar is private", async () => {
    render(await FeedEmptyState({ locale: "en", signedIn: true, viewer: { cellarPublic: false } }));

    expect(screen.getByText(/This is where cellars people have chosen to make public/)).toBeInTheDocument();
    expect(
      screen.getByText(/Your own cellar is private, so your additions won't show up here\./),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Make your cellar public" })).toHaveAttribute(
      "href",
      "/en/profile",
    );
    expect(screen.queryByRole("link", { name: "Create an account" })).not.toBeInTheDocument();
  });

  it("does not show the private-cellar hint when the viewer's cellar is already public", async () => {
    render(await FeedEmptyState({ locale: "en", signedIn: true, viewer: { cellarPublic: true } }));

    expect(
      screen.queryByText("Your own cellar is private, so your additions won't show up here."),
    ).not.toBeInTheDocument();
  });
});
