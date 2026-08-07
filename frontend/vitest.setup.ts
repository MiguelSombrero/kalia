import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";
import { expect, vi } from "vitest";

expect.extend(toHaveNoViolations);

/**
 * Unit tests run anonymous unless they say otherwise. Anything importing
 * `@/auth` — `features/auth/AuthStatus.tsx` for the session, its `actions.ts`
 * for signIn/signOut — otherwise loads next-auth's runtime, which fails to
 * resolve `next/server` outside a Next.js build. A test wanting a signed-in
 * caller overrides `auth` with `vi.mocked`.
 */
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

/**
 * Same reason, one layer down: `lib/api/mutator.ts` reads the session cookie
 * to attach a bearer token (ADR-0028/ADR-0030), and `next/headers`' `cookies()`
 * throws outside a request scope, which a unit test has no way to enter. A
 * test wanting a signed-in caller overrides this with `vi.mocked`.
 */
vi.mock("@/lib/auth/sessionCookie", () => ({
  currentSessionToken: vi.fn(async () => undefined),
}));
