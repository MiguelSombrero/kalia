import * as SecureStore from "expo-secure-store";
import { createSecureTokens } from "./secureTokens";

const mockMemory = new Map<string, string>();
const mockWrites: string[] = [];

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockMemory.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockWrites.push(key);
    mockMemory.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockMemory.delete(key);
  }),
}));

const tokens = { accessToken: "access", refreshToken: "refresh", expiresAt: 1_700_000_300_000 };

beforeEach(() => {
  mockMemory.clear();
  mockWrites.length = 0;
});

describe("the secure token storage", () => {
  it("reads back what it saved", async () => {
    const storage = createSecureTokens();

    await storage.save(tokens);

    await expect(storage.load()).resolves.toEqual(tokens);
  });

  it("holds nothing before a sign-in", async () => {
    await expect(createSecureTokens().load()).resolves.toBeNull();
  });

  it("mockWrites the refresh token before the access token", async () => {
    await createSecureTokens().save(tokens);

    expect(mockWrites.indexOf("kalia.auth.refreshToken")).toBe(0);
  });

  it("keeps only the refresh token usable when the access token was never written", async () => {
    mockMemory.set("kalia.auth.refreshToken", "refresh");

    await expect(createSecureTokens().load()).resolves.toEqual({
      accessToken: "",
      refreshToken: "refresh",
      expiresAt: 0,
    });
  });

  it("treats a stored expiry that is not a number as already expired", async () => {
    await createSecureTokens().save(tokens);
    mockMemory.set("kalia.auth.expiresAt", "soon");

    await expect(createSecureTokens().load()).resolves.toMatchObject({ expiresAt: 0 });
  });

  it("removes every item on clear", async () => {
    const storage = createSecureTokens();
    await storage.save(tokens);

    await storage.clear();

    expect(mockMemory.size).toBe(0);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledTimes(3);
  });
});
