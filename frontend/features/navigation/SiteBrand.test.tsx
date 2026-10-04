import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { SiteBrand } from "./SiteBrand";

describe("SiteBrand", () => {
  it("is a link to the front page of the locale, named for both the product and where it goes", async () => {
    const { container } = render(await SiteBrand({ locale: "fi" }));

    const link = screen.getByRole("link", { name: "Kalia, Etusivu" });
    expect(link).toHaveAttribute("href", "/fi");
    expect(await axe(container)).toHaveNoViolations();
  });
});
