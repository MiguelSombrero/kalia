import { expect } from "@playwright/test";

import { WEB_ORIGIN } from "./origins";
import { formatTracedRequests, summaryLine, test, type TracedRequest } from "./traceIds";

const traced = (id: string, path: string, status: number): TracedRequest => ({
  traceId: id.padEnd(32, "0"),
  method: "GET",
  path,
  status,
});

test.describe("the requests a page makes are named by the trace the server put them in", () => {
  test("a page load is named, with the id the server answered it with", async ({ page, tracedRequests }) => {
    const response = await page.goto("/en");

    const header = (await response?.allHeaders())?.["x-kalia-trace-id"];
    expect(header).toMatch(/^[0-9a-f]{32}$/);
    expect(tracedRequests).toContainEqual({ traceId: header, method: "GET", path: "/en", status: 200 });
  });

  test("a static asset is not named, and a query string never is", async ({ page, tracedRequests }) => {
    await page.goto("/en?secret=value");
    await expect(page.getByRole("banner")).toBeVisible();

    expect(tracedRequests.length).toBeGreaterThan(0);
    for (const request of tracedRequests) {
      expect(request.path).not.toMatch(/^\/_next\/|\.[a-z0-9]+$|\?/i);
    }
    expect(formatTracedRequests(tracedRequests)).not.toContain("secret");
  });

  test("a context a spec opens itself is noted too", async ({ browser, tracedRequests }) => {
    const context = await browser.newContext();
    try {
      const page = await context.newPage();
      await page.goto(`${WEB_ORIGIN}/en`);
      await expect(page.getByRole("banner")).toBeVisible();
    } finally {
      await context.close();
    }

    expect(tracedRequests.map(({ path }) => path)).toContain("/en");
  });
});

test.describe("the line a failure carries", () => {
  test("names the requests that went wrong before the ones made last", () => {
    const requests = [traced("a", "/en", 200), traced("b", "/en/cellar", 500), traced("c", "/en/beers", 200)];

    const line = summaryLine(requests);

    expect(line).toContain(`${"b".padEnd(32, "0")} GET /en/cellar 500`);
    expect(line).not.toContain("a".padEnd(32, "0"));
    expect(line).toContain("1 of 3 request that went wrong");
  });

  test("names the last three requests when none went wrong", () => {
    const requests = ["a", "b", "c", "d"].map((id) => traced(id, `/en/${id}`, 200));

    const line = summaryLine(requests);

    expect(line).toContain("3 of 4 requests answered last");
    expect(line).not.toContain("a".padEnd(32, "0"));
  });
});
