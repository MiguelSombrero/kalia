import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Providers } from "./providers";

/** Throws during render unless a QueryClientProvider is above it. */
const QueryClientProbe = () => {
  useQueryClient();
  return <p>query client available</p>;
};

describe("Providers", () => {
  it("provides a TanStack QueryClient to client components", () => {
    render(
      <Providers>
        <QueryClientProbe />
      </Providers>,
    );

    expect(screen.getByText("query client available")).toBeInTheDocument();
  });
});
