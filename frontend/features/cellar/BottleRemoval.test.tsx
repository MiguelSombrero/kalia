// Exercises the confirm-then-remove flow end to end: the beer blocks, their
// tiles, RemoveBottleDialog and RemovalOutcomeToast coordinate through the
// shared removal store, so this test renders the real composition
// (CellarBeerList) rather than any one component in isolation.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { buttonVariants } from "@/components/ui/button";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const waitFor = vi.waitFor;

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key} ${JSON.stringify(opts)}` : key,
  }),
}));

const { removeBottleAction } = vi.hoisted(() => ({ removeBottleAction: vi.fn() }));
vi.mock("./actions", () => ({ removeBottleAction }));
vi.mock("next/navigation", () => ({ useSearchParams: () => new URLSearchParams() }));

import { CellarBeerList } from "./CellarBeerList";
import { useBottleRemovalStore } from "./store";
import type { Bottle, CellarBeer } from "./types";

const REMOVE = /^cellar\.bottle\.removeFor/;
const CONFIRM = "cellar.bottle.remove.confirm";
const CANCEL = "cellar.bottle.remove.cancel";
const TOAST = "cellar.bottle.remove.toast";
const TOAST_LAST_BOTTLE = "cellar.bottle.remove.toastLastBottle";
const TOAST_ERROR = "cellar.bottle.remove.error";

const bottle = (id: string, entryId: string, containerType: Bottle["containerType"]): Bottle => ({
  id,
  entryId,
  containerType,
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
});

const westvleteren: CellarBeer = {
  entryId: "e1",
  beerId: "b1",
  beerName: "Westvleteren 12",
  breweryName: "Brouwerij Westvleteren",
  style: "Quadrupel",
  abv: 10.2,
  bottles: [bottle("bottle-1", "e1", "BOTTLE")],
};

const sahti: CellarBeer = {
  entryId: "e2",
  beerId: "b2",
  beerName: "Pihtiputaan Sahti",
  breweryName: "Pihtiputaan Käsityöpanimo",
  style: "Sahti",
  abv: 8,
  bottles: [bottle("bottle-2", "e2", "CAN"), bottle("bottle-3", "e2", "KEG")],
};

const renderCellar = () => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CellarBeerList locale="en" beers={[westvleteren, sahti]} owner />
    </QueryClientProvider>,
  );
};

const bottleListFor = (beerName: string) => within(screen.getByRole("list", { name: new RegExp(beerName) }));
const removeButtonsFor = (beerName: string) =>
  bottleListFor(beerName).getAllByRole("button", { name: REMOVE });

const confirmDialog = () => within(screen.getByRole("dialog"));

beforeEach(() => {
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
    renderCellar();

    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2);

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(removeBottleAction).not.toHaveBeenCalled();
    expect(confirmDialog().getByRole("button", { name: CONFIRM }).className).toBe(buttonVariants("destructive"));

    fireEvent.click(confirmDialog().getByRole("button", { name: CONFIRM }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(1);
    await waitFor(() => expect(removeBottleAction).toHaveBeenCalledWith("bottle-2"));
    await waitFor(() => expect(screen.getByText(TOAST)).toBeInTheDocument());
    expect(screen.getByText(TOAST).closest("[data-variant]")).toHaveAttribute("data-variant", "success");
  });

  it("issues no DELETE and leaves the bottle untouched when canceled", async () => {
    renderCellar();

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    fireEvent.click(confirmDialog().getByRole("button", { name: CANCEL }));

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2);
    expect(removeBottleAction).not.toHaveBeenCalled();
  });

  it("reports a failed DELETE with an error toast and restores the bottle", async () => {
    removeBottleAction.mockRejectedValue(new Error("boom"));
    renderCellar();

    fireEvent.click(removeButtonsFor("Pihtiputaan Sahti")[0]);
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(confirmDialog().getByRole("button", { name: CONFIRM }));

    await waitFor(() => expect(screen.getByText(TOAST_ERROR)).toBeInTheDocument());
    expect(screen.getByText(TOAST_ERROR).closest("[data-variant]")).toHaveAttribute("data-variant", "destructive");
    expect(removeButtonsFor("Pihtiputaan Sahti")).toHaveLength(2);
  });

  it("removes a beer once its last bottle is removed, and the toast names the consequence", async () => {
    renderCellar();

    fireEvent.click(bottleListFor("Westvleteren 12").getByRole("button", { name: REMOVE }));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(confirmDialog().getByRole("button", { name: CONFIRM }));

    await waitFor(() =>
      expect(screen.queryByRole("heading", { name: "Westvleteren 12" })).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText(TOAST_LAST_BOTTLE)).toBeInTheDocument());
    expect(screen.queryByText(TOAST)).not.toBeInTheDocument();
  });
});
