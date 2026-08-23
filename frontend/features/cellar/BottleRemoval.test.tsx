// Exercises the undo-toast removal flow end to end: BeerRow, BottleList and
// UndoRemoveToast coordinate through the shared removal store, so this test
// renders the real composition (CellarList) rather than any one component
// in isolation.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// RTL's own `waitFor` detects fake timers via a global `jest` object
// (testing-library/dom's jestFakeTimersAreEnabled), which Vitest's `vi`
// fake timers don't satisfy — it silently falls back to real-time polling
// and hangs. Vitest's own `vi.waitFor` has no such assumption.
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
import { REMOVE_UNDO_DELAY_MS } from "./store";
import type { Bottle, CellarBeerRow } from "./types";

// The mocked react-i18next above passes keys through untranslated.
const REMOVE = "cellar.bottle.remove.action";
const UNDO = "cellar.bottle.remove.undo";
const TOAST = "cellar.bottle.remove.toast";

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

// Only setTimeout/clearTimeout are faked, and only from here on — i18next's
// own init (run inside CellarList, awaited by renderCellar/expand above)
// relies on a real setTimeout internally and hangs forever if it's already
// faked when that runs.
const fakeRemovalTimer = () => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });

beforeEach(() => {
  listCellarBottlesAction.mockReset();
  listCellarBottlesAction.mockImplementation((entryId: string) =>
    Promise.resolve(bottlesByEntry[entryId]),
  );
  removeBottleAction.mockReset();
  removeBottleAction.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("bottle removal with undo", () => {
  it("hides the bottle and shows an undo toast, finalizing the DELETE once the toast elapses", async () => {
    await renderCellar();
    await expand("Pihtiputaan Sahti");
    fakeRemovalTimer();

    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2);

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);

    await waitFor(() => expect(screen.getByText(TOAST)).toBeInTheDocument());
    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(1);
    expect(removeBottleAction).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);

    expect(removeBottleAction).toHaveBeenCalledWith("bottle-2");
  });

  it("restores the bottle on Undo, and never sends the DELETE request", async () => {
    await renderCellar();
    await expand("Pihtiputaan Sahti");
    fakeRemovalTimer();

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);
    await waitFor(() => expect(screen.getByText(TOAST)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: UNDO }));

    await waitFor(() => expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2));
    expect(screen.queryByText(TOAST)).not.toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);
    expect(removeBottleAction).not.toHaveBeenCalled();
  });

  it("removes a beer's row once its last bottle is removed, and Undo restores both", async () => {
    await renderCellar();
    await expand("Westvleteren 12");
    fakeRemovalTimer();

    fireEvent.click(screen.getByRole("button", { name: REMOVE }));

    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Westvleteren 12/ })).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByRole("button", { name: UNDO }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Westvleteren 12/ })).toBeInTheDocument(),
    );
    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);
    expect(removeBottleAction).not.toHaveBeenCalled();
  });

  it("finalizes the first removal immediately when a second one starts — one toast at a time", async () => {
    await renderCellar();
    await expand("Westvleteren 12");
    await expand("Pihtiputaan Sahti");
    fakeRemovalTimer();

    fireEvent.click(removeButtonsFor("Westvleteren 12")[0]);
    await waitFor(() => expect(screen.getByText(TOAST)).toBeInTheDocument());

    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS / 2);
    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);

    await waitFor(() => expect(removeBottleAction).toHaveBeenCalledWith("bottle-1"));
    expect(removeBottleAction).toHaveBeenCalledTimes(1);
    expect(screen.getByText(TOAST)).toBeInTheDocument();

    await vi.advanceTimersByTimeAsync(REMOVE_UNDO_DELAY_MS);
    expect(removeBottleAction).toHaveBeenCalledTimes(2);
  });
});
