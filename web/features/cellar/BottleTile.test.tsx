import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import enCommon from "@kalia/locales/en/common.json";
import fiCommon from "@kalia/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

vi.mock("./actions", () => ({ addBottlesAction: vi.fn(), updateBottleAction: vi.fn(), removeBottleAction: vi.fn() }));

import { BottleTile } from "./BottleTile";
import type { Bottle } from "./types";

const bottleOf = (containerType: string): Bottle => ({
  id: "bottle-1",
  entryId: "e1",
  // A newer backend can send a value this build's generated union does not list.
  containerType: containerType as Bottle["containerType"],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

const renderTile = (containerType: string, locale: Locale = "en") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <ul>
        <BottleTile locale={locale} bottle={bottleOf(containerType)} number={1} beerName="Westvleteren 12" owner={false} />
      </ul>
    </I18nextProvider>,
  );
};

describe("BottleTile", () => {
  it("names a container type it lists", () => {
    renderTile("CAN");

    expect(screen.getByText("Can 1")).toBeInTheDocument();
  });

  it("names a container type this build does not list with the generic word, not a missing key", async () => {
    const { container } = renderTile("GROWLER");

    expect(screen.getByText("Other 1")).toBeInTheDocument();
    expect(screen.queryByText(/undefined|cellar\.bottle\.container/)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("uses the Finnish generic word in fi", () => {
    renderTile("GROWLER", "fi");

    expect(screen.getByText("Muu 1")).toBeInTheDocument();
  });
});
