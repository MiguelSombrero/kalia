import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelativeTime } from "@/components/ui/relative-time";

describe("shared relative-time formatter, imported from a feature other than cellar", () => {
  it("renders through components/ui from features/profile", () => {
    render(<RelativeTime instant="2026-09-13T11:59:00.000Z" locale="en" now={new Date("2026-09-13T12:00:00.000Z")} />);

    expect(screen.getByText("1 minute ago")).toBeInTheDocument();
  });
});
