import { expect, type Locator, type Page } from "@playwright/test";

const LABELS = {
  en: { queue: "Queue", next: "Next" },
  fi: { queue: "Jono", next: "Seuraava" },
} as const;

// The queue streams in below the page's title, so a page's rows are on screen once its first row is.
const rowsShown = (queue: Locator) => expect(queue.getByRole("listitem").first()).toBeVisible();

/** The admin queue's row for a suggestion, on the page it is on; the rows of each page are shown before they are counted. */
export const findQueueRow = async (page: Page, name: string, locale: keyof typeof LABELS = "en"): Promise<Locator> => {
  const labels = LABELS[locale];
  const queue = page.getByRole("list", { name: labels.queue });
  const row = queue.getByRole("button", { name: new RegExp(name) });
  await rowsShown(queue);
  for (let attempt = 0; attempt < 20 && (await row.count()) === 0; attempt++) {
    const before = page.url();
    await page.getByRole("link", { name: labels.next }).click();
    await page.waitForURL((url) => url.href !== before);
    await rowsShown(queue);
  }
  return row;
};
