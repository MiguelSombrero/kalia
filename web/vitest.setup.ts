import { registerTransport } from "@kalia/api";
import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";
import { expect, vi } from "vitest";

expect.extend(toHaveNoViolations);

// Vitest 5's `JestAssertion` no longer extends the global `jest.Matchers`
// namespace, so @types/jest-axe's `declare global` augmentation stops
// reaching vitest's `Assertion` type; re-declare it on vitest's own
// extension point. Module augmentation needs `interface`, not the `type`
// ADR-0037 requires, and the exact type-parameter list vitest declares.
declare module "vitest" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions, @typescript-eslint/no-unused-vars
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toHaveNoViolations(): R;
  }
}

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

// The real package throws on import outside a React Server layer, which is
// every unit test; Next.js resolves it for the build, vitest does not.
vi.mock("server-only", () => ({}));

// And `headers()`, which kaliaFetch reads the request's traceparent from.
vi.mock("@/lib/api/requestTrace", () => ({
  currentTraceparent: vi.fn(async () => undefined),
}));

// And `headers()` again, for the client address kaliaFetch forwards.
vi.mock("@/lib/api/requestClient", () => ({
  currentClientAddress: vi.fn(async () => undefined),
}));

// A unit test that reaches the generated client goes through the web's own
// transport, as instrumentation.ts registers it at startup. Imported at call
// time, so a test's mocks of what it reads (the session, fetch) are in place.
registerTransport((url, options) => import("@/lib/api/mutator").then(({ kaliaFetch }) => kaliaFetch(url, options)));
