import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { Toast, ToastDescription, ToastProvider, ToastViewport, type ToastVariant } from "./toast";

vi.mock("./icon", () => ({
  Icon: ({ name }: { name: string }) => <span data-testid="icon" data-name={name} />,
}));

const renderToast = (variant: ToastVariant) =>
  render(
    <ToastProvider>
      <Toast variant={variant} open>
        <ToastDescription>Pullo poistettu.</ToastDescription>
      </Toast>
      <ToastViewport />
    </ToastProvider>,
  );

describe("Toast", () => {
  it("marks a success with a tick on the success colour", async () => {
    const { container } = renderToast("success");

    expect(screen.getByTestId("icon")).toHaveAttribute("data-name", "check");
    expect(screen.getByTestId("icon").parentElement?.className).toContain("bg-success text-success-foreground");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("marks a failure with a cross on the destructive colour", () => {
    renderToast("destructive");

    expect(screen.getByTestId("icon")).toHaveAttribute("data-name", "close");
    expect(screen.getByTestId("icon").parentElement?.className).toContain(
      "bg-destructive text-destructive-foreground",
    );
  });
});
