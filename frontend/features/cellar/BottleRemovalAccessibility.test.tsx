// Complements BottleRemoval.test.tsx's flow coverage: this checks the
// remove control, the confirmation dialog and the outcome toast with real
// translated text in both locales, since that file mocks react-i18next to
// raw keys.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
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

const openConfirmDialog = async (removeLabel: string) => {
  fireEvent.click((await screen.findAllByRole("button", { name: removeLabel }))[0]);
  return screen.findByRole("dialog");
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
  // The removal store is a module-level singleton: state left behind by one
  // test would otherwise leak into whichever test runs next.
  useBottleRemovalStore.setState({ removing: [], outcome: null });
});

describe.each([["en"], ["fi"]] as const)("bottle removal accessibility (%s)", (locale) => {
  const removeLabel = locale === "en" ? "Remove" : "Poista";
  const cancelLabel = locale === "en" ? "Cancel" : "Peruuta";

  it("has no a11y violations with the remove and edit controls visible", async () => {
    const { container } = await renderCellar(locale);

    fireEvent.click(screen.getByRole("button", { name: new RegExp(row.beerName) }));
    await screen.findAllByRole("listitem");

    expect(await axe(container)).toHaveNoViolations();
  });

  it("opens a keyboard-reachable confirmation dialog with no a11y violations, cancelable via Escape", async () => {
    await renderCellar(locale);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(row.beerName) }));

    const removeButton = (await screen.findAllByRole("button", { name: removeLabel }))[0];
    removeButton.focus();
    expect(removeButton).toHaveFocus();

    const dialog = await openConfirmDialog(removeLabel);
    expect(await axe(document.body)).toHaveNoViolations();

    const dialogScope = within(dialog);
    const cancelButton = dialogScope.getByRole("button", { name: cancelLabel });
    const confirmButton = dialogScope.getByRole("button", { name: removeLabel });
    cancelButton.focus();
    expect(cancelButton).toHaveFocus();
    confirmButton.focus();
    expect(confirmButton).toHaveFocus();

    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(removeBottleAction).not.toHaveBeenCalled();
  });

  it("has no a11y violations once the outcome toast is showing", async () => {
    const { container } = await renderCellar(locale);
    fireEvent.click(screen.getByRole("button", { name: new RegExp(row.beerName) }));

    const dialog = await openConfirmDialog(removeLabel);
    fireEvent.click(within(dialog).getByRole("button", { name: removeLabel }));

    await screen.findByText(locale === "en" ? "Bottle removed." : "Pullo poistettu.");

    expect(await axe(container)).toHaveNoViolations();
    // The toast renders in its own portal, outside `container`.
    const notifications = screen.getByRole("region", { name: /Notifications/ });
    expect(await axe(notifications)).toHaveNoViolations();
  });
});
