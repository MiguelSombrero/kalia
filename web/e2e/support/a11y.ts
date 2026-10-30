import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// WCAG 2.2 AA (ADR-0075) — the same bar frontend/README.md's testing
// conventions set for the jest-axe layer, applied here to real pages. One tag
// scope for the whole suite, so a spec cannot quietly scan a narrower one than
// its neighbours.
const WCAG_22_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22a", "wcag22aa"];

export const expectNoA11yViolations = async (page: Page): Promise<void> => {
  const { violations, passes, incomplete, inapplicable } = await new AxeBuilder({ page })
    .withTags(WCAG_22_AA)
    .analyze();

  expect(violations, "axe found WCAG 2.2 AA violations").toEqual([]);
  // axe ships target-size, its one 2.2 rule, disabled by default: only the
  // wcag22aa tag turns it on, and a scan without it still passes.
  expect(
    [...passes, ...incomplete, ...inapplicable].map((result) => result.id),
    "axe ran no WCAG 2.2 check",
  ).toContain("target-size");
  // A target axe cannot measure (one overlapped by another) is reported as
  // incomplete rather than as a violation, and would otherwise pass unseen.
  expect(
    incomplete.filter((result) => result.id === "target-size").flatMap((result) => result.nodes.map((n) => n.target)),
    "targets axe could not size",
  ).toEqual([]);
};

// axe checks neither that a page has exactly one h1 nor that levels descend
// one at a time (its heading-order rule is a best practice, outside the WCAG
// tags above), so the outline is read off the page here.
export const expectCoherentHeadings = async (page: Page): Promise<void> => {
  const levels = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, h6, [role=heading]")]
      .filter((heading) => heading.getClientRects().length > 0 && !heading.closest("[aria-hidden=true]"))
      .map((heading) => ({
        // A role="heading" with no aria-level is level 2 (WAI-ARIA).
        level: Number(heading.getAttribute("aria-level") ?? (/^H[1-6]$/.test(heading.tagName) ? heading.tagName[1] : 2)),
        text: (heading.textContent ?? "").trim(),
      })),
  );

  expect(levels.filter(({ level }) => level === 1), "a page has one h1").toHaveLength(1);
  expect(levels[0]?.level, "the first heading is the h1").toBe(1);
  const skips = levels
    .slice(1)
    .filter(({ level }, i) => level > levels[i]!.level + 1)
    .map(({ level, text }) => `h${level} "${text}"`);
  expect(skips, "headings that skip a level").toEqual([]);
};
