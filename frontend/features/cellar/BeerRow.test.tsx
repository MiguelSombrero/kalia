import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) => (opts ? `${key} ${JSON.stringify(opts)}` : key),
  }),
}));

const { listCellarBottlesAction } = vi.hoisted(() => ({ listCellarBottlesAction: vi.fn() }));
vi.mock("./actions", () => ({ listCellarBottlesAction }));

import { BeerRow } from "./BeerRow";
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

const renderRow = (locale: "en" | "fi" = "en") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BeerRow locale={locale} row={row} />
    </QueryClientProvider>,
  );
};

describe("BeerRow", () => {
  it("shows the beer summary collapsed, with bottles hidden until expanded, no a11y violations", async () => {
    const { container } = renderRow();

    const toggle = screen.getByRole("button", { name: /Westvleteren 12/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(listCellarBottlesAction).not.toHaveBeenCalled();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders collapsed in Finnish with no a11y violations", async () => {
    const { container } = renderRow("fi");

    expect(screen.getByRole("button", { name: /Westvleteren 12/ })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("expands to show two bottles of the same beer distinguished by their own dates", async () => {
    listCellarBottlesAction.mockResolvedValue([
      {
        id: "bottle-1",
        entryId: "e1",
        containerType: "BOTTLE",
        brewedDate: "2023-01-01",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
      {
        id: "bottle-2",
        entryId: "e1",
        containerType: "BOTTLE",
        brewedDate: "2025-06-01",
        bestBeforeDate: "2026-06-01",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ]);

    const { container } = renderRow();
    screen.getByRole("button", { name: /Westvleteren 12/ }).click();

    await waitFor(() => expect(listCellarBottlesAction).toHaveBeenCalledWith("e1"));
    const items = await screen.findAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(items[0].textContent).not.toEqual(items[1].textContent);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("shows a bottle with neither date by its container type only", async () => {
    listCellarBottlesAction.mockResolvedValue([
      {
        id: "bottle-3",
        entryId: "e1",
        containerType: "KEG",
        createdAt: "2026-01-01",
        updatedAt: "2026-01-01",
      },
    ]);

    renderRow();
    screen.getByRole("button", { name: /Westvleteren 12/ }).click();

    const item = await screen.findByRole("listitem");
    expect(item.textContent).toBe("cellar.bottle.container.KEG");
  });

  it("shows an inline error when the bottle fetch fails", async () => {
    listCellarBottlesAction.mockRejectedValue(new Error("boom"));

    renderRow();
    screen.getByRole("button", { name: /Westvleteren 12/ }).click();

    expect(await screen.findByText("cellar.bottle.error")).toBeInTheDocument();
  });
});
