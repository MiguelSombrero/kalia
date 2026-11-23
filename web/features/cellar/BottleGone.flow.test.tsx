// A bottle that is already gone (ADR-0023): the generated client answers 404
// and everything above it is real — api, Server Actions, hooks, dialogs and the
// outcome toast — so what the user sees is what the 404 produces, not what a
// mocked action was told to return.
import enCommon from "@kalia/locales/en/common.json";
import fiCommon from "@kalia/locales/fi/common.json";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getOptions, type Locale } from "@/i18n/settings";

const { removeBottle, updateBottle, revalidatePath } = vi.hoisted(() => ({
  removeBottle: vi.fn(),
  updateBottle: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@kalia/api/generated/cellar/cellar", () => ({
  removeBottle,
  updateBottle,
  addBottles: vi.fn(),
  listEntries: vi.fn(),
  readHoldings: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/auth", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

import { CellarBeerList } from "./CellarBeerList";
import { RemovalOutcomeToast } from "./RemovalOutcomeToast";
import { useBottleRemovalStore } from "./store";
import type { Bottle, CellarBeer } from "./types";

const bottle = (id: string): Bottle => ({
  id,
  entryId: "e1",
  containerType: "CAN",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});

const sahti: CellarBeer = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Pihtiputaan Sahti",
  breweryName: "Pihtiputaan Käsityöpanimo",
  style: "Sahti",
  abv: 8,
  bottles: [bottle("bottle-1"), bottle("bottle-2")],
};

const COPY = {
  en: {
    remove: /^Remove .* of Pihtiputaan Sahti/,
    confirm: "Remove",
    edit: /^Edit .* of Pihtiputaan Sahti/,
    save: "Save",
    removed: "Bottle removed.",
    gone: "This bottle had already been removed.",
    failed: "Could not remove the bottle. Please try again.",
    editFailed: "Could not save changes. Please try again.",
  },
  fi: {
    remove: /^Poista: Pihtiputaan Sahti, /,
    confirm: "Poista",
    edit: /^Muokkaa: Pihtiputaan Sahti, /,
    save: "Tallenna",
    removed: "Pullo poistettu.",
    gone: "Tämä pullo oli jo poistettu.",
    failed: "Pullon poisto epäonnistui. Yritä uudelleen.",
    editFailed: "Muutosten tallennus epäonnistui. Yritä uudelleen.",
  },
} as const;

const renderCellar = (locale: Locale, beers: CellarBeer[] = [sahti]) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const tree = (shown: CellarBeer[]) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <main id="main-content" tabIndex={-1}>
          <CellarBeerList locale={locale} beers={shown} owner />
        </main>
        <RemovalOutcomeToast />
      </I18nextProvider>
    </QueryClientProvider>
  );
  const rendered = render(tree(beers));
  return { ...rendered, showBeers: (shown: CellarBeer[]) => rendered.rerender(tree(shown)) };
};

const tileButtons = (name: RegExp) => within(screen.getByRole("list", { name: /Pihtiputaan Sahti/ })).getAllByRole("button", { name });

const answered = (status: number) => ({ status, data: {}, headers: new Headers() });

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  useBottleRemovalStore.setState({ removing: [], outcome: null });
});

describe.each(["en", "fi"] as const)("a bottle that is already gone, in %s", (locale) => {
  const copy = COPY[locale];

  it("counts a removal answered 404 as done: the bottle stays gone, no failure, the entry is read again", async () => {
    removeBottle.mockResolvedValue(answered(404));
    const { showBeers } = renderCellar(locale);
    expect(tileButtons(copy.remove)).toHaveLength(2);

    fireEvent.click(tileButtons(copy.remove)[0]!);
    fireEvent.click(await within(await screen.findByRole("dialog")).findByRole("button", { name: copy.confirm }));

    await waitFor(() => expect(revalidatePath).toHaveBeenCalledWith("/[locale]/cellar", "page"));
    // What the re-read entry shows: the bottle is not there.
    showBeers([{ ...sahti, bottles: [bottle("bottle-2")] }]);
    expect(await screen.findAllByText(copy.removed)).not.toHaveLength(0);
    expect(screen.queryByText(copy.failed)).not.toBeInTheDocument();
    expect(tileButtons(copy.remove)).toHaveLength(1);
  });

  it("closes an edit answered 404, tells a screen reader the bottle was already removed, and reads the entry again", async () => {
    updateBottle.mockResolvedValue(answered(404));
    renderCellar(locale);

    fireEvent.click(tileButtons(copy.edit)[0]!);
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: copy.save }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(revalidatePath).toHaveBeenCalledWith("/[locale]/cellar", "page"));
    await waitFor(() =>
      expect(screen.getAllByRole("status").some((node) => node.textContent?.includes(copy.gone))).toBe(true),
    );
    expect(screen.queryByText(copy.editFailed)).not.toBeInTheDocument();
  });
});
