import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SiteFooter } from "./SiteFooter";

describe("SiteFooter", () => {
  it("carries the mark and the tagline in the locale and nothing that can be operated", async () => {
    const { container } = render(await SiteFooter({ locale: "fi" }));

    expect(screen.getByRole("contentinfo")).toBeInTheDocument();
    expect(screen.getByText("Käsityöoluiden hallintaa olutharrastajille.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
