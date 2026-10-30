import { afterEach, describe, expect, it, vi } from "vitest";
import { apiError } from "@kalia/api";

// Throws like the real one, so code after it never runs.
const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("./api", () => ({ getProfile: vi.fn() }));

import { getProfile } from "./api";
import { getOwnProfile, getOwnProfileOrNull, isUsernameTaken } from "./ownProfile";

const profile = { username: "ada", cellarPublic: false };
const taken = apiError("http", "Profile lookup failed with status 409", { status: 409 });
const down = apiError("network", "Could not reach the backend");

describe("own profile reads", () => {
  afterEach(() => {
    redirect.mockClear();
  });

  it("returns the caller's profile", async () => {
    vi.mocked(getProfile).mockResolvedValue(profile);

    await expect(getOwnProfile("en")).resolves.toEqual(profile);
    await expect(getOwnProfileOrNull("en")).resolves.toEqual(profile);
    expect(redirect).not.toHaveBeenCalled();
  });

  it("sends a caller whose username is taken to the page that says so, in their locale", async () => {
    vi.mocked(getProfile).mockRejectedValue(taken);

    await expect(getOwnProfile("fi")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenLastCalledWith("/fi/username-taken");
    await expect(getOwnProfileOrNull("en")).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenLastCalledWith("/en/username-taken");
  });

  it("leaves any other failure to the caller", async () => {
    vi.mocked(getProfile).mockRejectedValue(down);

    await expect(getOwnProfile("en")).rejects.toBe(down);
    await expect(getOwnProfileOrNull("en")).resolves.toBeNull();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("recognises only a 409 as a taken username", () => {
    expect(isUsernameTaken(taken)).toBe(true);
    expect(isUsernameTaken(apiError("http", "Profile lookup failed with status 500", { status: 500 }))).toBe(false);
    expect(isUsernameTaken(down)).toBe(false);
  });
});
