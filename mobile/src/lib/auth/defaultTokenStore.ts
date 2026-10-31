import { origins } from "@/lib/config/origins";
import { createKeycloakClient } from "./keycloakClient";
import { createSecureTokens } from "./secureTokens";
import { createTokenStore, type TokenStore } from "./tokenStore";

let instance: TokenStore | undefined;

export const getTokenStore = (): TokenStore =>
  (instance ??= createTokenStore({
    storage: createSecureTokens(),
    oauth: createKeycloakClient({ keycloakOrigin: origins.keycloak }),
    now: Date.now,
  }));
