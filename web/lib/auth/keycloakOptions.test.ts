import { describe, expect, it } from "vitest";
import { buildKeycloakProvider } from "./keycloakOptions";

describe("keycloakOptions", () => {
  // Pins ADR-0033's decision: removing this should be a deliberate, reviewed
  // edit, not a silent one. See frontend/e2e/sign-up.spec.ts for the
  // end-to-end failure this flag prevents.
  it("keeps allowDangerousEmailAccountLinking set", () => {
    expect(buildKeycloakProvider().options!.allowDangerousEmailAccountLinking).toBe(true);
  });

  // Pins the precondition ADR-0033's safety argument rests on: both provider
  // entries must derive from the one shared client, never their own
  // credentials. Fails if a future edit gives one entry an inline override.
  it("gives both provider variants identical clientId and issuer", () => {
    const signIn = buildKeycloakProvider();
    const register = buildKeycloakProvider({
      id: "keycloak-register",
      name: "Keycloak (register)",
      authorization: { url: "https://example.test/registrations" },
    });

    expect(register.options!.clientId).toBe(signIn.options!.clientId);
    expect(register.options!.issuer).toBe(signIn.options!.issuer);
  });

  // Pins ADR-0071's one name everywhere; see keycloakOptions.ts for why it is needed.
  it("names the user by their Keycloak username", () => {
    const profile = buildKeycloakProvider().options!.profile!;

    expect(
      profile({ sub: "kc-1", preferred_username: "ada", name: "Ada Lovelace", email: "ada@example.test" } as never, {} as never),
    ).toEqual({ id: "kc-1", name: "ada", email: "ada@example.test" });
  });
});
