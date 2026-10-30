import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Fails when the focused element cannot be seen at all — WCAG 2.2's 2.4.11
 * Focus Not Obscured, which no axe rule checks. The element counts as seen
 * when any of a grid of points across the part of its box inside the viewport
 * is topmost at that point, so a sticky bar, a fixed toast or the edge of the
 * viewport covering all of it fails, and covering only part of it does not —
 * however tall the element is.
 */
export const expectFocusNotObscured = async (page: Page): Promise<void> => {
  const obscured = await page.evaluate(() => {
    const focused = document.activeElement as HTMLElement | null;
    if (!focused || focused === document.body) return "focus is on no element";
    const box = focused.getBoundingClientRect();
    const fractions = [0.1, 0.5, 0.9];
    const left = Math.max(box.left, 0);
    const top = Math.max(box.top, 0);
    const right = Math.min(box.right, window.innerWidth);
    const bottom = Math.min(box.bottom, window.innerHeight);
    const inViewport = left < right && top < bottom;
    // Hit-testing skips pointer-events: none, which Radix puts on <body> while
    // a dialog is open; what is painted on top is the question here, not what
    // would take a click.
    const paintOnly = document.createElement("style");
    paintOnly.textContent = "* { pointer-events: auto !important; }";
    document.head.append(paintOnly);
    let seen = false;
    try {
      seen = inViewport && fractions.some((fx) =>
        fractions.some((fy) => {
          const x = left + (right - left) * fx;
          const y = top + (bottom - top) * fy;
          const painted = document.elementFromPoint(x, y);
          return painted !== null && (focused === painted || focused.contains(painted));
        }),
      );
    } finally {
      paintOnly.remove();
    }
    if (seen) return null;
    const label = focused.getAttribute("aria-label") ?? focused.textContent?.trim().slice(0, 60) ?? "";
    return `<${focused.tagName.toLowerCase()}> "${label}" at y=${Math.round(box.top)}–${Math.round(box.bottom)}`;
  });
  expect(obscured, "the focused element is entirely hidden").toBeNull();
};

/**
 * Presses Tab (or Shift+Tab) until `target` has focus, asserting at every stop
 * on the way that focus is on something and not hidden. A target that is
 * never reached within `limit` presses is a focus-order failure.
 */
export const tabTo = async (
  page: Page,
  target: Locator,
  { backwards = false, limit = 60 }: { backwards?: boolean; limit?: number } = {},
): Promise<void> => {
  await expect(target).toBeAttached();
  for (let presses = 0; presses < limit; presses += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return;
    await page.keyboard.press(backwards ? "Shift+Tab" : "Tab");
    await expectFocusNotObscured(page);
  }
  await expect(target, `not reached within ${limit} presses of ${backwards ? "Shift+Tab" : "Tab"}`).toBeFocused();
};
