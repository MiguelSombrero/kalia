// What the edge proxy does for the three things behind it (ADR-0090): serves
// only what a client needs, refuses a burst past a limit before it reaches the
// service, and tells the services which client address to believe. It runs last, after
// the rest of the suite (playwright.config.ts), because it deliberately
// exhausts a per-address budget that every other spec shares.
import { execFileSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import path from "node:path";
import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";
import { BACKEND_ORIGIN, WEB_ORIGIN, KEYCLOAK_ORIGIN, KEYCLOAK_ADMIN_ORIGIN } from "./support/origins";

const ROOT = path.resolve(__dirname, "../..");
const FORGED_ADDRESS = "203.0.113.77";

// In this order, one at a time: the burst tests use up the budgets the address
// test needs.
test.describe.configure({ mode: "serial", retries: 0 });

const logsOf = (service: string): string =>
  execFileSync("docker", ["compose", "logs", "--no-log-prefix", "--since", "10m", service], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  });

const linesMentioning = (logs: string, needle: string): string[] =>
  logs.split("\n").filter((line) => line.includes(needle));

/** The address the proxy saw the request come from, per its own access log. */
const addressSeenByEdge = (needle: string): string => {
  const [line] = linesMentioning(logsOf("edge"), needle);
  expect(line, `the edge logged no request for ${needle}`).toBeTruthy();
  return line.split(" ")[0];
};

test.describe("the client address", () => {
  test("is the one the proxy saw, whatever the caller claims, in Spring, Keycloak and through the web app", async ({
    request,
  }) => {
    const id = randomUUID().replaceAll("-", "");
    const forged = { "X-Forwarded-For": FORGED_ADDRESS };

    await request.get(`${BACKEND_ORIGIN}/api/v1/probe-${id}`, { headers: forged, failOnStatusCode: false });
    await request.get(`${KEYCLOAK_ORIGIN}/realms/kalia/probe-${id}`, { headers: forged, failOnStatusCode: false });
    const traceId = randomBytes(16).toString("hex");
    await request.get(`${WEB_ORIGIN}/en/beers`, {
      headers: { ...forged, traceparent: `00-${traceId}-${randomBytes(8).toString("hex")}-01` },
    });

    const seen = addressSeenByEdge(`probe-${id}`);
    expect(seen).not.toBe(FORGED_ADDRESS);

    const [backendLine] = linesMentioning(logsOf("backend"), `probe-${id}`);
    expect(backendLine, "Spring logged no request for the probe").toBeTruthy();
    expect(backendLine).toContain(`from ${seen}"`);

    const [keycloakLine] = linesMentioning(logsOf("keycloak"), `probe-${id}`);
    expect(keycloakLine, "Keycloak logged no request for the probe").toBeTruthy();
    expect(keycloakLine).toContain(` ${seen} - - [`);

    // The web app calls Spring itself, so the address reaches Spring only if
    // the web app passes on the one it was given.
    const bffCalls = linesMentioning(logsOf("backend"), traceId).filter((line) =>
      line.includes("GET /api/v1/beers"),
    );
    expect(bffCalls.length, "the page made no backend call under its trace").toBeGreaterThan(0);
    for (const line of bffCalls) {
      expect(line).toContain(`from ${seen}"`);
    }

    for (const service of ["backend", "keycloak", "web"]) {
      expect(logsOf(service), `${service} saw the forged address`).not.toContain(FORGED_ADDRESS);
    }
  });
});

test.describe("what the edge serves", () => {
  const notServed = [
    ["metrics", BACKEND_ORIGIN, "/actuator/prometheus"],
    ["the actuator index", BACKEND_ORIGIN, "/actuator"],
    ["a health sub-path", BACKEND_ORIGIN, "/actuator/health/readiness"],
    ["metrics, percent-encoded", BACKEND_ORIGIN, "/%61ctuator/prometheus"],
    ["the admin console", KEYCLOAK_ORIGIN, "/admin/master/console/"],
    ["the admin API", KEYCLOAK_ORIGIN, "/admin/realms/kalia/users"],
    ["the master realm", KEYCLOAK_ORIGIN, "/realms/master/protocol/openid-connect/token"],
    ["the master realm, in another case", KEYCLOAK_ORIGIN, "/realms/Master/.well-known/openid-configuration"],
    ["the back-channel logout", WEB_ORIGIN, "/api/auth/backchannel-logout"],
    ["the back-channel logout, with a trailing slash", WEB_ORIGIN, "/api/auth/backchannel-logout/"],
  ] as const;

  for (const [what, origin, route] of notServed) {
    test(`${what} (${route}) answers 404 through the public port, by the edge`, async ({ request }) => {
      for (const method of ["get", "post"] as const) {
        const response = await request[method](`${origin}${route}`, { failOnStatusCode: false, maxRedirects: 0 });
        expect(response.status(), `${method.toUpperCase()} ${route}`).toBe(404);
        expect(response.headers()["server"]).toBe("nginx");
      }
    });
  }

  test("the health probe, the realm's own endpoints and the web app are still served", async ({ request }) => {
    const health = await request.get(`${BACKEND_ORIGIN}/actuator/health`);
    expect(health.ok()).toBe(true);
    const realm = await request.get(`${KEYCLOAK_ORIGIN}/realms/kalia/.well-known/openid-configuration`);
    expect(realm.ok()).toBe(true);
    const page = await request.get(`${WEB_ORIGIN}/en/beers`);
    expect(page.ok()).toBe(true);
  });

  test("the master realm and the admin API are served on the admin port", async ({ request }) => {
    const master = await request.get(`${KEYCLOAK_ADMIN_ORIGIN}/realms/master/.well-known/openid-configuration`);
    expect(master.ok()).toBe(true);
    const admin = await request.get(`${KEYCLOAK_ADMIN_ORIGIN}/admin/realms/kalia/users`, { failOnStatusCode: false });
    expect(admin.status()).toBe(401);
  });

  test("the admin console on the admin port signs in against the admin port, not the public one", async ({
    request,
  }) => {
    const console = await (await request.get(`${KEYCLOAK_ADMIN_ORIGIN}/admin/master/console/`)).text();
    expect(console).toContain(`"authServerUrl": "${KEYCLOAK_ADMIN_ORIGIN}"`);
    expect(console).toContain(`"adminBaseUrl": "${KEYCLOAK_ADMIN_ORIGIN}"`);
  });
});

test.describe("the request logs", () => {
  test("the edge and Keycloak log a request's path and never its query string (ADR-0013)", async ({
    request,
  }) => {
    const id = randomUUID().replaceAll("-", "");
    const secret = `canary-${id}`;

    await request.get(`${KEYCLOAK_ORIGIN}/realms/kalia/probe-${id}?id_token_hint=${secret}`, {
      failOnStatusCode: false,
    });
    await request.get(`${WEB_ORIGIN}/en/beers/probe-${id}?query=${secret}`, {
      failOnStatusCode: false,
    });

    for (const service of ["edge", "keycloak"]) {
      const logs = logsOf(service);
      expect(linesMentioning(logs, `probe-${id}`), `${service} logged no request`).not.toHaveLength(0);
      expect(logs, `${service} logged a query string`).not.toContain(secret);
    }
  });
});

test.describe("the edge proxy's limits", () => {
  test("a burst on the backend is refused with 429 before it reaches Spring", async ({ request }) => {
    const id = randomUUID();
    const url = `${BACKEND_ORIGIN}/api/v1/burst-${id}?query=canary-${id}`;

    const responses = await Promise.all(
      Array.from({ length: 120 }, () => request.get(url, { failOnStatusCode: false })),
    );
    const refused = responses.filter((response) => response.status() === 429);
    const answered = responses.length - refused.length;

    expect(refused.length, "no request was refused").toBeGreaterThan(0);
    expect(refused[0].headers()["server"]).toBe("nginx");
    expect(answered, "the limit let the whole burst through").toBeLessThan(responses.length / 2);
    // nginx's error log names the refused request line, so a refusal must not be logged there.
    expect(logsOf("edge"), "a refusal logged the query string").not.toContain(`canary-${id}`);
    // A request Spring answered is a request Spring logged; the others never got there.
    await expect
      .poll(() => linesMentioning(logsOf("backend"), `burst-${id}`).length)
      .toBe(answered);
  });

  test("a registration is refused past the limit, at Keycloak's endpoint and through Kalia's button", async ({
    page,
    request,
  }) => {
    const username = `edge-${randomBytes(4).toString("hex")}`;
    await page.goto("/en/sign-up");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Continue to sign-up" }).click();
    await page.locator("#username").waitFor();
    await page.locator("#username").fill(username);
    await page.locator("#email").fill(`${username}@example.com`);
    await fillNamesWhenAsked(page);

    const submit = `${KEYCLOAK_ORIGIN}/realms/kalia/login-actions/registration?session_code=x&execution=y&client_id=kalia-web&tab_id=z`;
    const responses = await Promise.all(
      Array.from({ length: 60 }, () => request.post(submit, { failOnStatusCode: false })),
    );
    const refused = responses.filter((response) => response.status() === 429).length;
    expect(refused, "no registration was refused").toBeGreaterThan(0);
    expect(responses.length - refused, "the limit let the whole burst through").toBeLessThan(40);

    const submitted = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" && response.url().includes("/login-actions/registration"),
    );
    await page.getByRole("button", { name: /register|sign.?up/i }).click();

    expect((await submitted).status()).toBe(429);
  });
});

const fillNamesWhenAsked = async (page: Page) => {
  if (await page.locator("#firstName").count()) {
    await page.locator("#firstName").fill("Edge");
    await page.locator("#lastName").fill("Test");
  }
};
