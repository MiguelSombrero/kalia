import "@testing-library/jest-dom/vitest";
import { toHaveNoViolations } from "jest-axe";
import { expect, vi } from "vitest";

expect.extend(toHaveNoViolations);

/**
 * Unit tests run anonymous unless they say otherwise. `lib/api/mutator.ts`
 * reaches the session to attach a bearer token (ADR-0028), so without this
 * every test that touches the API layer loads next-auth's runtime — which
 * fails to resolve `next/server` outside a Next.js build. A test wanting a
 * signed-in caller overrides `auth` with `vi.mocked`.
 */
vi.mock("@/auth", () => ({
  auth: vi.fn(async () => null),
  handlers: {},
  signIn: vi.fn(),
  signOut: vi.fn(),
}));
