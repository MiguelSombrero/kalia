import { fireEvent, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import enCommon from "@kalia/locales/en/common.json";
import fiCommon from "@kalia/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";
import { AddBeerOutcomeAlert } from "./AddBeerOutcomeAlert";
import type { AddBeerOutcome } from "./types";

const pohjala = { id: "7f1c2a3b-0000-4000-8000-000000000001", name: "Põhjala", place: "Tallinn, Estonia" };

const renderAlert = (
  outcome: AddBeerOutcome | undefined,
  { locale = "en", failed = false, refusalMarked = false }: { locale?: Locale; failed?: boolean; refusalMarked?: boolean } = {},
) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const onUseBrewery = vi.fn();
  const rendered = render(
    <I18nextProvider i18n={i18n}>
      <AddBeerOutcomeAlert
        locale={locale}
        outcome={outcome}
        failed={failed}
        refusalMarked={refusalMarked}
        onUseBrewery={onUseBrewery}
      />
    </I18nextProvider>,
  );
  return { ...rendered, onUseBrewery };
};

describe("AddBeerOutcomeAlert", () => {
  it.each([
    undefined,
    { kind: "added", beer: { id: "b", name: "Öö" }, landsOnSearch: true } as AddBeerOutcome,
  ])("says nothing before there is an answer, or for an added beer", (outcome) => {
    const { container } = renderAlert(outcome);

    expect(container).toBeEmptyDOMElement();
  });

  it("links to the beer a visible duplicate duplicates", () => {
    renderAlert({ kind: "duplicateBeer", existing: { id: "b1", name: "Öö", breweryName: "Põhjala" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Öö (Põhjala) is already in the catalog.");
    expect(screen.getByRole("link", { name: "Open Öö" })).toHaveAttribute("href", "/en/beers/b1");
  });

  it("names a duplicate without its brewery when the lookup found none", () => {
    renderAlert({ kind: "duplicateBeer", existing: { id: "b1", name: "Öö", breweryName: "" } });

    expect(screen.getByRole("alert")).toHaveTextContent("Öö is already in the catalog.");
  });

  it("hands the duplicated brewery to the form to use", () => {
    const { onUseBrewery } = renderAlert({ kind: "duplicateBrewery", existing: pohjala });

    expect(screen.getByRole("alert")).toHaveTextContent("Põhjala (Tallinn, Estonia) is already in the catalog.");
    fireEvent.click(screen.getByRole("button", { name: "Use it" }));
    expect(onUseBrewery).toHaveBeenCalledWith(pohjala);
  });

  it.each([
    [
      "en",
      "Someone has already suggested this beer, and it is waiting for review. Check back once it has been reviewed.",
    ],
    ["fi", "Joku on jo ehdottanut tätä olutta, ja se odottaa tarkistusta. Katso myöhemmin uudelleen."],
  ] as const)("says in %s that the beer was suggested and waits, with nothing to choose", (locale, text) => {
    renderAlert({ kind: "pendingElsewhere" }, { locale });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(text);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it.each([
    [
      "en",
      "You already have as many suggestions waiting for review as Kalia allows. Only suggestions waiting for review count towards the limit. You can add more once some of them have been reviewed.",
    ],
    [
      "fi",
      "Sinulla on jo niin monta ehdotusta odottamassa tarkistusta kuin Kalia sallii. Rajaan lasketaan vain tarkistusta odottavat ehdotukset. Voit lisätä uusia, kun osa niistä on tarkistettu.",
    ],
  ] as const)("says in %s that the pending limit is reached", (locale, text) => {
    renderAlert({ kind: "pendingCap" }, { locale });

    expect(screen.getByRole("alert")).toHaveTextContent(text);
  });

  it("points at the marked field only when the form marked one", () => {
    const { unmount } = renderAlert({ kind: "refused", fields: [] }, { refusalMarked: true });
    expect(screen.getByRole("alert")).toHaveTextContent("Check the marked field and try again.");
    unmount();

    renderAlert({ kind: "refused", fields: [] });
    expect(screen.getByRole("alert")).toHaveTextContent("Check it and try again.");
  });

  it("says the request failed when there is no answer to show", () => {
    renderAlert(undefined, { failed: true });

    expect(screen.getByRole("alert")).toHaveTextContent("Could not add the beer. Please try again.");
  });

  it.each([
    { kind: "pendingElsewhere" },
    { kind: "pendingCap" },
    { kind: "duplicateBrewery", existing: pohjala },
  ] as AddBeerOutcome[])("has no a11y violations for $kind", async (outcome) => {
    const { container } = renderAlert(outcome);

    expect(await axe(container)).toHaveNoViolations();
  });
});
