import { createFetchTransport, registerTransport } from "@kalia/api";
import { getTokenStore } from "@/lib/auth/defaultTokenStore";
import type { TokenStore } from "@/lib/auth/tokenStore";
import { origins } from "@/lib/config/origins";

export const registerMobileTransport = (tokenStore: TokenStore = getTokenStore()): void =>
  registerTransport(createFetchTransport({ baseUrl: () => origins.api, accessToken: tokenStore.getAccessToken }));
