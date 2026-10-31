import { origins, parseOrigins } from "./origins";

describe("parseOrigins", () => {
  it("returns both origins without a trailing slash", () => {
    expect(parseOrigins({ api: "http://api.test/", keycloak: "https://keycloak.test" })).toEqual({
      api: "http://api.test",
      keycloak: "https://keycloak.test",
    });
  });

  it("names the variable that is missing", () => {
    expect(() => parseOrigins({ keycloak: "http://keycloak.test" })).toThrow("EXPO_PUBLIC_API_ORIGIN");
    expect(() => parseOrigins({ api: "http://api.test" })).toThrow("EXPO_PUBLIC_KEYCLOAK_ORIGIN");
  });

  it.each(["localhost:8080", "ftp://api.test", "http://api.test/api/v1", ""])("refuses %j, which is not an origin", (api) => {
    expect(() => parseOrigins({ api, keycloak: "http://keycloak.test" })).toThrow("EXPO_PUBLIC_API_ORIGIN");
  });
});

describe("origins", () => {
  it("are read from the environment the run set", () => {
    expect(origins).toEqual({ api: "http://api.test", keycloak: "http://keycloak.test" });
  });
});
