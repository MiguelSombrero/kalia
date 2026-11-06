import { apiError } from "@kalia/api";
import { beforeEach, describe, expect, it, vi } from "vitest";

const signIn = vi.fn();
const { addBottlesToCellar, updateCellarBottle, removeCellarBottle } = vi.hoisted(() => ({
  addBottlesToCellar: vi.fn(),
  updateCellarBottle: vi.fn(),
  removeCellarBottle: vi.fn(),
}));

vi.mock("@/auth", () => ({ signIn }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("./api", () => ({ addBottlesToCellar, updateCellarBottle, removeCellarBottle }));

const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";

const formData = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.append(key, value);
  return data;
};

const redirectTo = (): unknown => (signIn.mock.calls[0][1] as { redirectTo: unknown }).redirectTo;

describe("startCellarSignIn", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the visitor to the beer they signed in from", async () => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ beerId, locale: "fi" }));

    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: `/fi/beers/${beerId}` },
      { ui_locales: "fi" },
    );
  });

  it.each([
    ["an off-site URL", "https://evil.example/phish"],
    ["a protocol-relative URL", "//evil.example/phish"],
    ["a path smuggled after a valid id", `${beerId}/../../../evil`],
    ["a non-UUID id", "not-a-beer"],
  ])("sends the visitor to their cellar instead of following %s", async (_, suppliedBeerId) => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ beerId: suppliedBeerId, locale: "en" }));

    expect(redirectTo()).toBe("/en/cellar");
  });

  it("returns the visitor to the beer in the default locale when the form's locale is not one the app serves", async () => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ beerId, locale: "//evil.example" }));

    expect(signIn).toHaveBeenCalledWith(
      "keycloak",
      { redirectTo: `/en/beers/${beerId}` },
      { ui_locales: "en" },
    );
  });

  it("sends the visitor to their cellar when the form carries no beer", async () => {
    const { startCellarSignIn } = await import("./actions");

    await startCellarSignIn(formData({ locale: "en" }));

    expect(redirectTo()).toBe("/en/cellar");
  });
});

// A Server Action's thrown error reaches the client stripped to
// name/message/stack, so the 409 a lost concurrent write answers has to
// cross the boundary as a returned value (features/feed/actions.ts).
describe("a cellar write that lost to a concurrent change", () => {
  const lost = () => apiError("http", "lost", { status: 409 });
  const request = { beerId, containerType: "CAN" as const };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["adding", async () => (await import("./actions")).addBottlesAction(request), addBottlesToCellar],
    ["updating", async () => (await import("./actions")).updateBottleAction("b1", request), updateCellarBottle],
    ["removing", async () => (await import("./actions")).removeBottleAction("b1"), removeCellarBottle],
  ])("is returned as a conflict, not thrown, when %s a bottle", async (_, run, api) => {
    api.mockRejectedValue(lost());

    await expect(run()).resolves.toEqual({ conflict: true });
  });

  it("still throws any other failure", async () => {
    const { addBottlesAction } = await import("./actions");
    const failure = apiError("http", "boom", { status: 500 });
    addBottlesToCellar.mockRejectedValue(failure);

    await expect(addBottlesAction(request)).rejects.toBe(failure);
  });
});
