// The most backend calls one page render makes, signed out and signed in, is
// the figure edge/limits.json pins and ADR-0090 computes the load one address
// can drive through the web zone from: the edge sees one request, and a render
// is several calls the backend's own zone never counts.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import path from "node:path";
import type { Page, Route } from "@playwright/test";
import { expect, signIn, test } from "./support/keycloakAccount";
import { BACKEND_ORIGIN } from "./support/origins";

const ROOT = path.resolve(__dirname, "../..");
const { backendCallsPerPageRender } = JSON.parse(readFileSync(path.join(ROOT, "edge/limits.json"), "utf8")) as {
  backendCallsPerPageRender: number;
};

test.describe.configure({ mode: "serial" });

/** Backend requests logged under one trace id, which only the navigation carries. */
const backendCallsUnder = (traceId: string): number =>
  execFileSync("docker", ["compose", "logs", "--no-log-prefix", "--since", "5m", "backend"], {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
  })
    .split("\n")
    .filter((line) => line.includes(traceId) && /(GET|POST|PUT|PATCH|DELETE) \/api\/v1\//.test(line)).length;

const callsMadeRendering = async (page: Page, route: string): Promise<number> => {
  const traceId = randomBytes(16).toString("hex");
  const traceparent = `00-${traceId}-${randomBytes(8).toString("hex")}-01`;
  // Only the document request carries it: a prefetch or a Server Action the
  // page then makes starts a trace of its own.
  const attach = (route: Route) =>
    route.request().isNavigationRequest()
      ? route.continue({ headers: { ...route.request().headers(), traceparent } })
      : route.continue();
  await page.route("**/*", attach);
  try {
    await page.goto(route, { waitUntil: "load" });
    await page.waitForTimeout(1_000);
    return backendCallsUnder(traceId);
  } finally {
    await page.unroute("**/*", attach);
  }
};

test("no page render makes more backend calls than edge/limits.json pins, and the heaviest makes exactly that many", async ({
  page,
  request,
  account,
}) => {
  const first = (await (await request.get(`${BACKEND_ORIGIN}/api/v1/beers?size=1`)).json()).content[0].id as string;
  const routes = ["/en", "/en/beers", `/en/beers/${first}`, "/en/cellar", "/en/profile", `/en/cellars/${account.username}`];

  const measured: Record<string, number> = {};
  for (const route of routes) measured[`signed out ${route}`] = await callsMadeRendering(page, route);
  await page.goto("/en");
  await signIn(page, account);
  for (const route of routes) measured[`signed in ${route}`] = await callsMadeRendering(page, route);

  const heaviest = Math.max(...Object.values(measured));
  expect(heaviest, JSON.stringify(measured, null, 1)).toBe(backendCallsPerPageRender);
});
