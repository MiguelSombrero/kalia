import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { listCellarBottlesAction } = vi.hoisted(() => ({ listCellarBottlesAction: vi.fn() }));
vi.mock("./actions", () => ({ listCellarBottlesAction }));

import { useCellarBottles } from "./useCellarBottles";

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe("useCellarBottles", () => {
  it("does not fetch while disabled", () => {
    renderHook(() => useCellarBottles("e1", { enabled: false }), { wrapper: createWrapper() });

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
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(listCellarBottlesAction).toHaveBeenCalledWith("e1");
    expect(result.current.data).toHaveLength(1);
  });
});
