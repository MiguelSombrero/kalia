import { act, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import { getOptions } from "@/i18n/settings";
import { BeerRow, JustAddedBadge, JustAddedToast } from "./JustAdded";
import { useJustAddedStore } from "./store";

const withI18n = (children: ReactNode) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({ ...getOptions("en"), resources: { en: { common: enCommon } } });
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

const rows = () =>
  withI18n(
    <ul>
      <BeerRow beerId="new" className="row">
        Öö Bourbon <JustAddedBadge beerId="new" />
      </BeerRow>
      <BeerRow beerId="old" className="row">
        Öö <JustAddedBadge beerId="old" />
      </BeerRow>
    </ul>,
  );

beforeEach(() => {
  useJustAddedStore.setState({ beer: null, toastOpen: false });
});

describe("the just-added marks", () => {
  it("mark nothing until this browser adds a beer", () => {
    render(rows());

    expect(screen.queryByText("Just added")).not.toBeInTheDocument();
    expect(screen.getAllByRole("listitem").map((row) => row.className)).toEqual(["row", "row"]);
  });

  it("highlight the added beer's row once and badge it, and no other", async () => {
    act(() => useJustAddedStore.getState().announce({ id: "new", name: "Öö Bourbon" }));
    const { container } = render(rows());

    const [added, other] = screen.getAllByRole("listitem");
    expect(added).toHaveClass("motion-safe:animate-feed-reveal");
    expect(added).toHaveTextContent("Just added");
    expect(other).not.toHaveClass("motion-safe:animate-feed-reveal");
    expect(other).not.toHaveTextContent("Just added");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("announce the added beer in a toast, which keeps the badge when dismissed", async () => {
    render(withI18n(<JustAddedToast />));
    act(() => useJustAddedStore.getState().announce({ id: "new", name: "Öö Bourbon" }));

    expect(await screen.findByText("Öö Bourbon is in the catalog.")).toBeInTheDocument();
    act(() => useJustAddedStore.getState().dismissToast());
    expect(useJustAddedStore.getState().beer).toEqual({ id: "new", name: "Öö Bourbon" });
  });
});
