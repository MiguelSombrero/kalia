import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";
import { expect, vi } from "vitest";

expect.extend(toHaveNoViolations);

// Unit tests run anonymous by default: importing `@/auth` otherwise loads
// next-auth's runtime, which fails to resolve `next/server` outside a Next.js
// build. A signed-in test overrides `auth` with `vi.mocked`.
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

// Same reason, one layer down: `next/headers`' `cookies()` throws outside a
// request scope, which a unit test has no way to enter.
vi.mock("@/lib/auth/sessionCookie", () => ({
  currentSessionToken: vi.fn(async () => undefined),
}));
