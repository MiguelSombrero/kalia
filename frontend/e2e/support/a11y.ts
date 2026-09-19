import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

// WCAG 2.1 AA — the same bar frontend/README.md's testing conventions set for
// the jest-axe layer, applied here to real pages. One tag scope for the whole
// suite, so a spec cannot quietly scan a narrower one than its neighbours.
export const expectNoA11yViolations = async (page: Page): Promise<void> => {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  expect(violations, "axe found WCAG 2.1 AA violations").toEqual([]);
};
