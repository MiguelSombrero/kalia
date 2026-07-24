import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders a native button and fires onClick", async () => {
    const onClick = vi.fn();
    const { container } = render(<Button onClick={onClick}>Save</Button>);

    screen.getByRole("button", { name: "Save" }).click();

    expect(onClick).toHaveBeenCalledOnce();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("defaults to the primary variant", () => {
    render(<Button>Save</Button>);

    expect(screen.getByRole("button", { name: "Save" }).className).toBe(buttonVariants("primary"));
  });

  it("merges a custom className with the outline variant", () => {
    render(
      <Button variant="outline" className="extra">
        Cancel
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Cancel" }).className).toBe(
      `${buttonVariants("outline")} extra`,
    );
  });
});
