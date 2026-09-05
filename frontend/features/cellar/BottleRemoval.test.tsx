// Exercises the confirm-then-remove flow end to end: BeerRow, BottleList,
// RemoveBottleDialog and RemovalOutcomeToast coordinate through the shared
// removal store, so this test renders the real composition (CellarList)
// rather than any one component in isolation.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const waitFor = vi.waitFor;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}));

const { listCellarBottlesAction, removeBottleAction } = vi.hoisted(() => ({
  listCellarBottlesAction: vi.fn(),
  removeBottleAction: vi.fn(),
}));
vi.mock("./actions", () => ({ listCellarBottlesAction, removeBottleAction }));

import { CellarList } from "./CellarList";
import { useBottleRemovalStore } from "./store";
import type { Bottle, CellarBeerRow } from "./types";

const REMOVE = "cellar.bottle.remove.action";
const CONFIRM = "cellar.bottle.remove.confirm";
const CANCEL = "cellar.bottle.remove.cancel";
const TOAST = "cellar.bottle.remove.toast";
const TOAST_LAST_BOTTLE = "cellar.bottle.remove.toastLastBottle";
const TOAST_ERROR = "cellar.bottle.remove.error";

const westvleteren: CellarBeerRow = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Westvleteren 12",
  breweryName: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  bottleCount: 1,
};

const sahti: CellarBeerRow = {
  entryId: "e2",
  beerId: "b2",
  beerName: "Pihtiputaan Sahti",
  breweryName: "Pihtiputaan Käsityöpanimo",
  style: "Sahti",
  abv: 8,
  bottleCount: 2,
};

const bottlesByEntry: Record<string, Bottle[]> = {
  e1: [
    {
      id: "bottle-1",
      entryId: "e1",
      containerType: "BOTTLE",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
  e2: [
    {
      id: "bottle-2",
      entryId: "e2",
      containerType: "CAN",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
    {
      id: "bottle-3",
      entryId: "e2",
      containerType: "KEG",
      createdAt: "2026-01-01",
      updatedAt: "2026-01-01",
    },
  ],
};

const renderCellar = async () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      {await CellarList({ locale: "en", rows: [westvleteren, sahti] })}
    </QueryClientProvider>,
  );
};

const expand = async (beerName: string) => {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(beerName) }));
  await waitFor(() =>
    expect(screen.getByRole("list", { name: new RegExp(beerName) })).toBeInTheDocument(),
  );
};

const bottleListFor = (beerName: string) => within(screen.getByRole("list", { name: new RegExp(beerName) }));
const removeButtonsFor = (beerName: string) =>
  bottleListFor(beerName).getAllByRole("button", { name: REMOVE });

const confirmDialog = () => within(screen.getByRole("dialog"));

beforeEach(() => {
  listCellarBottlesAction.mockReset();
  listCellarBottlesAction.mockImplementation((entryId: string) =>
    Promise.resolve(bottlesByEntry[entryId]),
  );
  removeBottleAction.mockReset();
  removeBottleAction.mockResolvedValue(undefined);
});

afterEach(() => {
  // The removal store is a module-level singleton: state left behind by one
  // test would otherwise leak into whichever test runs next.
  useBottleRemovalStore.setState({ removing: [], outcome: null });
});

describe("bottle removal with an upfront confirmation", () => {
  it("commits the DELETE immediately on confirm, with no delay", async () => {
    await renderCellar();
    await expand("Pihtiputaan Sahti");

    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2);

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(removeBottleAction).not.toHaveBeenCalled();

    fireEvent.click(confirmDialog().getByRole("button", { name: CONFIRM }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(1);
    await waitFor(() => expect(removeBottleAction).toHaveBeenCalledWith("bottle-2"));
    await waitFor(() => expect(screen.getByText(TOAST)).toBeInTheDocument());
  });

  it("issues no DELETE and leaves the bottle untouched when canceled", async () => {
    await renderCellar();
    await expand("Pihtiputaan Sahti");

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(confirmDialog().getByRole("button", { name: CANCEL }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2);
    expect(removeBottleAction).not.toHaveBeenCalled();
  });

  it("reports a failed DELETE with an error toast and restores the bottle", async () => {
    removeBottleAction.mockRejectedValue(new Error("boom"));
    await renderCellar();
    await expand("Pihtiputaan Sahti");

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(confirmDialog().getByRole("button", { name: CONFIRM }));

    await waitFor(() => expect(screen.getByText(TOAST_ERROR)).toBeInTheDocument());
    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2);
  });

  it("removes a beer's row once its last bottle is removed, and the toast names the consequence", async () => {
    await renderCellar();
    await expand("Westvleteren 12");

    fireEvent.click(screen.getByRole("button", { name: REMOVE }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(confirmDialog().getByRole("button", { name: CONFIRM }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Westvleteren 12/ })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText(TOAST_LAST_BOTTLE)).toBeInTheDocument());
    expect(screen.queryByText(TOAST)).not.toBeInTheDocument();
  });
});
