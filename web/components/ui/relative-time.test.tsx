import { render, screen } from "@testing-library/react";
import { axe } from "jest-axe";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RelativeTime } from "./relative-time";

const now = new Date("2026-09-13T12:00:00.000Z");

describe("RelativeTime", () => {
  it("renders the relative text with no a11y violations", async () => {
    const { container } = render(<RelativeTime instant="2026-09-13T11:59:00.000Z" locale="en" now={now} />);

    expect(screen.getByText("1 minute ago")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("carries the exact instant on the time element in the relative case", () => {
    const instant = "2026-09-13T11:59:00.000Z";
    render(<RelativeTime instant={instant} locale="en" now={now} />);

    expect(screen.getByText("1 minute ago").tagName).toBe("TIME");
    expect(screen.getByText("1 minute ago")).toHaveAttribute("datetime", instant);
  });

  it("carries the exact instant on the time element in the absolute-date case", () => {
    const instant = "2026-01-01T00:00:00.000Z";
    render(<RelativeTime instant={instant} locale="en" now={now} />);

    expect(screen.getByText("Jan 1, 2026").tagName).toBe("TIME");
    expect(screen.getByText("Jan 1, 2026")).toHaveAttribute("datetime", instant);
  });

  describe("server/client rendering parity", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("renders identical markup on the server and after hydration, even as the wall clock advances", () => {
      const instant = "2026-09-13T11:59:00.000Z";

      vi.setSystemTime(now);
      const serverMarkup = renderToStaticMarkup(<RelativeTime instant={instant} locale="en" now={now} />);
      // Compared after parsing, like a browser hydrating server HTML would —
      // the HTML parser itself lowercases attribute names, so a raw string
      // diff against jsdom's already-parsed client DOM reports a false
      // mismatch on casing alone.
      const parsedServerMarkup = document.createElement("div");
      parsedServerMarkup.innerHTML = serverMarkup;

      vi.setSystemTime(new Date(now.getTime() + 5_000));
      const { container: clientContainer } = render(<RelativeTime instant={instant} locale="en" now={now} />);

      expect(clientContainer.innerHTML).toBe(parsedServerMarkup.innerHTML);
    });
  });
});
