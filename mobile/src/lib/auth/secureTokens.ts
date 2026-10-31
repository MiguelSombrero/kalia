import * as SecureStore from "expo-secure-store";
import type { TokenStorage } from "./tokenStore";

const REFRESH_TOKEN = "kalia.auth.refreshToken";
const ACCESS_TOKEN = "kalia.auth.accessToken";
const EXPIRES_AT = "kalia.auth.expiresAt";

export const createSecureTokens = (): TokenStorage => ({
  load: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN);
    if (!refreshToken) {
      return null;
    }
    const [accessToken, expiry] = await Promise.all([
      SecureStore.getItemAsync(ACCESS_TOKEN),
      SecureStore.getItemAsync(EXPIRES_AT),
    ]);
    const expiresAt = Number(expiry);
    return { accessToken: accessToken ?? "", refreshToken, expiresAt: Number.isFinite(expiresAt) ? expiresAt : 0 };
  },
  save: async ({ accessToken, refreshToken, expiresAt }) => {
    await SecureStore.setItemAsync(REFRESH_TOKEN, refreshToken);
    await SecureStore.setItemAsync(ACCESS_TOKEN, accessToken);
    await SecureStore.setItemAsync(EXPIRES_AT, String(expiresAt));
  },
  clear: async () => {
    await Promise.all([REFRESH_TOKEN, ACCESS_TOKEN, EXPIRES_AT].map((key) => SecureStore.deleteItemAsync(key)));
  },
});
