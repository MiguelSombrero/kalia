import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { listCellarBottlesAction, addBottlesAction } = vi.hoisted(() => ({
  listCellarBottlesAction: vi.fn(),
  addBottlesAction: vi.fn(),
}));
vi.mock("../actions", () => ({ listCellarBottlesAction, addBottlesAction }));

import { useAddBottle, useCellarBottles } from "./useBottles";

const createHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, Wrapper };
};

describe("useCellarBottles", () => {
  it("does not fetch while disabled", () => {
    renderHook(() => useCellarBottles("e1", { enabled: false }), {
      wrapper: createHarness().Wrapper,
    });

    expect(listCellarBottlesAction).not.toHaveBeenCalled();
  });

  it("fetches the entry's bottles once enabled, keyed by entryId", async () => {
    listCellarBottlesAction.mockResolvedValue([
      {
        id: "b1",
        entryId: "e1",
        containerType: "BOTTLE",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ]);

    const { result } = renderHook(() => useCellarBottles("e1", { enabled: true }), {
      wrapper: createHarness().Wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listCellarBottlesAction).toHaveBeenCalledWith("e1");
    expect(result.current.data).toHaveLength(1);
  });
});

describe("useAddBottle", () => {
  it("sends the request through the server action", async () => {
    addBottlesAction.mockResolvedValue([
      {
        id: "b1",
        entryId: "e1",
        containerType: "CAN",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ]);
    const request = { beerId: "beer-1", containerType: "CAN" as const, quantity: 2 };

    const { result } = renderHook(() => useAddBottle(), { wrapper: createHarness().Wrapper });
    result.current.mutate(request);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(addBottlesAction).toHaveBeenCalledWith(request);
  });

  // ADR-0041's point: without this, a just-added bottle stays invisible.
  it("invalidates the bottle list of the entry it added to", async () => {
    addBottlesAction.mockResolvedValue([
      {
        id: "b1",
        entryId: "e1",
        containerType: "BOTTLE",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ]);
    const { queryClient, Wrapper } = createHarness();
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useAddBottle(), { wrapper: Wrapper });
    result.current.mutate({ beerId: "beer-1", containerType: "BOTTLE", quantity: 1 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["cellar", "bottles", "e1"] });
  });
});
