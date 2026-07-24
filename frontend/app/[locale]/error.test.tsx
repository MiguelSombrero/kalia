import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import ErrorPage from "./error";

describe("ErrorPage", () => {
  it("renders the error message and calls unstable_retry when the retry button is clicked", async () => {
    const unstableRetry = vi.fn();
    const error = Object.assign(new Error("boom"), { digest: "abc123" });
    const { container } = render(<ErrorPage error={error} unstable_retry={unstableRetry} />);

    expect(screen.getByRole("heading", { level: 1, name: "error.title" })).toBeInTheDocument();
    expect(screen.getByText("error.message")).toBeInTheDocument();

    screen.getByRole("button", { name: "error.retry" }).click();
    expect(unstableRetry).toHaveBeenCalledOnce();

    expect(await axe(container)).toHaveNoViolations();
  });

  it("logs the error for server-side traceability", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = Object.assign(new Error("boom"), { digest: "abc123" });

    render(<ErrorPage error={error} unstable_retry={vi.fn()} />);

    expect(consoleError).toHaveBeenCalledWith(error);
    consoleError.mockRestore();
  });
});
