import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import { nameTag, visibilityTiles } from "@/features/profile";
import { ProfileViewSkeleton } from "./ProfileViewSkeleton";

describe("ProfileViewSkeleton", () => {
  it("draws the name tag and the two visibility choices in the frames the profile uses", async () => {
    const { container } = render(await ProfileViewSkeleton({ locale: "en" }));

    const status = screen.getByRole("status", { name: "Loading your profile…" });
    const tag = status.firstElementChild as HTMLElement;
    expect(tag.className).toContain(nameTag);
    expect(tag.querySelectorAll('[aria-hidden="true"]')).toHaveLength(4);
    const tiles = container.querySelector(`[class="${visibilityTiles}"]`);
    expect(tiles?.children).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });
});
