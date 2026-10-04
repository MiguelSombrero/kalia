import { expect, type Page } from "@playwright/test";

const MIN_TARGET = 24;

export const expectShellTargetsReachable = async (page: Page): Promise<void> => {
  const tooSmall = await page.evaluate((min) => {
    const controls = document.querySelectorAll<HTMLElement>(
      "header a[href], header button, header input, footer a[href], footer button, footer input",
    );
    return [...controls]
      .map((control) => ({ control, box: control.getBoundingClientRect() }))
      .filter(({ box }) => box.width > 0 && box.height > 0 && (box.width < min || box.height < min))
      .map(
        ({ control, box }) =>
          `${(control.getAttribute("aria-label") ?? control.textContent ?? control.tagName).trim()} ${Math.round(box.width)}×${Math.round(box.height)}`,
      );
  }, MIN_TARGET);

  expect(tooSmall, `shell controls under ${MIN_TARGET}×${MIN_TARGET} CSS pixels`).toEqual([]);
};
