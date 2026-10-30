import { describe, expect, it } from "vitest";
import { keycloakEndSessionUrl } from "./endSessionUrl";

const issuer = "http://localhost:8081/realms/kalia";
const postLogoutRedirectUri = "http://localhost:3000/";

describe("keycloakEndSessionUrl", () => {
  it("builds Keycloak's logout URL with the id_token hint and return address", () => {
    const url = keycloakEndSessionUrl({ issuer, idToken: "id-token", postLogoutRedirectUri });

    expect(url).not.toBeNull();
    const parsed = new URL(url!);
    expect(parsed.origin + parsed.pathname).toBe(
      "http://localhost:8081/realms/kalia/protocol/openid-connect/logout",
    );
    expect(parsed.searchParams.get("id_token_hint")).toBe("id-token");
    expect(parsed.searchParams.get("post_logout_redirect_uri")).toBe(postLogoutRedirectUri);
  });

  it("returns null when there is no id_token to end a Keycloak session with", () => {
    expect(
      keycloakEndSessionUrl({ issuer, idToken: undefined, postLogoutRedirectUri }),
    ).toBeNull();
  });

  it("returns null when no issuer is configured", () => {
    expect(
      keycloakEndSessionUrl({ issuer: undefined, idToken: "id-token", postLogoutRedirectUri }),
    ).toBeNull();
  });
});
