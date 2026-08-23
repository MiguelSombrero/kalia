// Complements BottleRemoval.test.tsx's flow coverage: this checks the
// remove control, the edit dialog and the undo toast with real translated
// text in both locales, since that file mocks react-i18next to raw keys.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { listCellarBottlesAction, removeBottleAction } = vi.hoisted(() => ({
  listCellarBottlesAction: vi.fn(),
  removeBottleAction: vi.fn(),
}));
vi.mock("./actions", () => ({ listCellarBottlesAction, removeBottleAction }));

import { CellarList } from "./CellarList";
import { useBottleRemovalStore } from "./store";
import type { CellarBeerRow } from "./types";

const row: CellarBeerRow = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Westvleteren 12",
  breweryName: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  bottleCount: 2,
};

const renderCellar = async (locale: Locale) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        {await CellarList({ locale, rows: [row] })}
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  listCellarBottlesAction.mockReset();
  listCellarBottlesAction.mockResolvedValue([
    {
      id: "bottle-1",
      entryId: "e1",
      containerType: "BOTTLE",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: "bottle-2",
      entryId: "e1",
      containerType: "CAN",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ]);
  removeBottleAction.mockReset();
  removeBottleAction.mockResolvedValue(undefined);
});

afterEach(() => {
  // The removal store is a module-level singleton: a removal left pending
  // by one test — with a real 5s setTimeout still running — would otherwise
  // leak into whichever test runs next.
  useBottleRemovalStore.getState().undoRemoval();
});

describe.each([["en"], ["fi"]] as const)("bottle removal accessibility (%s)", (locale) => {
  it("has no a11y violations with the remove and edit controls visible", async () => {
    const { container } = await renderCellar(locale);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(row.beerName) }));
    await screen.findAllByRole("listitem");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no a11y violations once the undo toast is showing, and Undo is keyboard-operable", async () => {
    const { container } = await renderCellar(locale);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(row.beerName) }));
    const removeLabel = locale === "en" ? "Remove" : "Poista";
    const undoLabel = locale === "en" ? "Undo" : "Kumoa";

    fireEvent.click((await screen.findAllByRole("button", { name: removeLabel }))[0]);
    const undoButton = await screen.findByRole("button", { name: undoLabel });

    expect(await axe(container)).toHaveNoViolations();
    // The toast renders in its own portal, outside `container`.
    const notifications = screen.getByRole("region", { name: /Notifications/ });
    expect(await axe(notifications)).toHaveNoViolations();

    undoButton.focus();
    expect(undoButton).toHaveFocus();
  });
});
