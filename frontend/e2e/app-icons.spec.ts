// The favicon, its PNG fallback and the apple-touch icon are served from URLs
// the locale proxy could swallow (the generated ones have no extension); this
// follows the links the page itself emits rather than assuming their paths.
import { expect, test } from "@playwright/test";

test("serves every icon the page links to", async ({ page, request }) => {
  await page.goto("/en");

  const links = await page
    .locator('link[rel="icon"], link[rel="apple-touch-icon"]')
    .evaluateAll((elements) =>
      elements.map((element) => ({ href: element.getAttribute("href"), type: element.getAttribute("type") })),
    );
  expect(links.map(({ type }) => type).sort()).toEqual(["image/png", "image/png", "image/svg+xml"]);

  for (const { href, type } of links) {
    const response = await request.get(href!, { maxRedirects: 0 });
    expect(response.status(), `icon at ${href}`).toBe(200);
    expect(response.headers()["content-type"]).toContain(type!);
  }
});
