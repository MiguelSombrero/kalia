import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { addBottlesAction, updateBottleAction, removeBottleAction } = vi.hoisted(() => ({
  addBottlesAction: vi.fn(),
  updateBottleAction: vi.fn(),
  removeBottleAction: vi.fn(),
}));
vi.mock("../actions", () => ({ addBottlesAction, updateBottleAction, removeBottleAction }));

import { useAddBottle, useRemoveBottle, useUpdateBottle } from "./useBottles";

const createHarness = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper };
};

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
});

describe("useUpdateBottle", () => {
  it("sends the request through the server action", async () => {
    const request = { containerType: "CAN" as const, brewedDate: "2024-01-01" };
    updateBottleAction.mockResolvedValue({
      id: "b1",
      entryId: "e1",
      containerType: "CAN",
      brewedDate: "2024-01-01",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    });

    const { result } = renderHook(() => useUpdateBottle(), { wrapper: createHarness().Wrapper });
    result.current.mutate({ id: "b1", request });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(updateBottleAction).toHaveBeenCalledWith("b1", request);
  });
});

describe("useRemoveBottle", () => {
  it("sends the bottle id through the server action", async () => {
    removeBottleAction.mockResolvedValue(undefined);

    const { result } = renderHook(() => useRemoveBottle(), { wrapper: createHarness().Wrapper });
    result.current.mutate({ id: "b1" });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(removeBottleAction).toHaveBeenCalledWith("b1");
  });
});
