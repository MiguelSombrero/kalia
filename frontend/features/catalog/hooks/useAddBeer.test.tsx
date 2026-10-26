import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { findSimilarBeersAction } = vi.hoisted(() => ({ findSimilarBeersAction: vi.fn() }));
vi.mock("../actions", () => ({
  findSimilarBeersAction,
  addBeerAction: vi.fn(),
  findBreweriesAction: vi.fn(),
  loadAddBeerOptionsAction: vi.fn(),
}));

import { useSimilarBeers } from "./useAddBeer";

const oo = { id: "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f", name: "Öö", style: "Imperial Stout", abv: 10.5 };

describe("useSimilarBeers", () => {
  it("keeps a brewery's beers while its name is retyped, but never shows them under another brewery", async () => {
    findSimilarBeersAction.mockImplementation(async (breweryId: string, name: string) =>
      breweryId === "a" && name === "Öö" ? [oo] : new Promise(() => {}),
    );
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(({ brewery, name }) => useSimilarBeers(brewery, name), {
      wrapper,
      initialProps: { brewery: "a", name: "Öö" },
    });
    await waitFor(() => expect(result.current.data).toEqual([oo]));

    rerender({ brewery: "a", name: "Öö B" });
    expect(result.current.data).toEqual([oo]);

    rerender({ brewery: "b", name: "Öö B" });
    expect(result.current.data).toBeUndefined();
  });
});
