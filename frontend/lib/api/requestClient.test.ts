import { beforeEach, describe, expect, it, vi } from "vitest";

const { headers } = vi.hoisted(() => ({ headers: vi.fn() }));
vi.mock("next/headers", () => ({ headers }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
vi.unmock("@/lib/api/requestClient");

import { currentClientAddress } from "./requestClient";

const withForwardedFor = (value: string | null) =>
  headers.mockResolvedValue(new Headers(value === null ? {} : { "x-forwarded-for": value }));

describe("currentClientAddress", () => {
  beforeEach(() => {
    headers.mockReset();
  });

  it("is the address the edge proxy forwarded", async () => {
    withForwardedFor("203.0.113.5");

    await expect(currentClientAddress()).resolves.toBe("203.0.113.5");
  });

  it("accepts an IPv6 address", async () => {
    withForwardedFor("2001:db8::1");

    await expect(currentClientAddress()).resolves.toBe("2001:db8::1");
  });

  it.each([["unknown"], ["203.0.113.5, 198.51.100.1"], ["<script>"], [""]])(
    "is undefined for %j, which is not one address",
    async (value) => {
      withForwardedFor(value);

      await expect(currentClientAddress()).resolves.toBeUndefined();
    },
  );

  it("is undefined when the request carries none", async () => {
    withForwardedFor(null);

    await expect(currentClientAddress()).resolves.toBeUndefined();
  });

  it("is undefined outside a request, where headers() throws", async () => {
    headers.mockRejectedValue(new Error("called outside a request scope"));

    await expect(currentClientAddress()).resolves.toBeUndefined();
  });
});
