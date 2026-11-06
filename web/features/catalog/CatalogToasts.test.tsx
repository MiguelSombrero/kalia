import { act, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it } from "vitest";
import enCommon from "@kalia/locales/en/common.json";
import fiCommon from "@kalia/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";
import { CatalogToasts } from "./CatalogToasts";
import { useBeerRemovedStore, useJustAddedStore } from "./store";

const withI18n = (children: ReactNode, locale: Locale = "en") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

beforeEach(() => {
  useJustAddedStore.setState({ beer: null, toastOpen: false, focusPending: false });
  useBeerRemovedStore.setState({ beer: null });
});

describe("the added-beer toast", () => {
  it("announces the added beer, which keeps the badge when dismissed", async () => {
    render(withI18n(<CatalogToasts />));
    act(() => useJustAddedStore.getState().announce({ id: "new", name: "Öö Bourbon" }));

    expect(
      await screen.findByText("Öö Bourbon was added. Only you can see it until it has been reviewed."),
    ).toBeInTheDocument();
    act(() => useJustAddedStore.getState().dismissToast());
    expect(useJustAddedStore.getState().beer).toEqual({ id: "new", name: "Öö Bourbon" });
  });

  it("says in Finnish that the added beer waits for review", async () => {
    render(withI18n(<CatalogToasts />, "fi"));
    act(() => useJustAddedStore.getState().announce({ id: "new", name: "Öö Bourbon" }));

    expect(
      await screen.findByText("Öö Bourbon lisättiin. Vain sinä näet sen, kunnes se on tarkistettu."),
    ).toBeInTheDocument();
  });
});

describe("the removed-beer notice", () => {
  it.each([
    ["en", "Öö Bourbon was removed from the catalog."],
    ["fi", "Öö Bourbon poistettiin luettelosta."],
  ] as const)("is announced as a status message, in %s", async (locale, message) => {
    useBeerRemovedStore.getState().announce({ name: "Öö Bourbon" });
    const { container } = render(withI18n(<CatalogToasts announceRemoval />, locale));

    expect(await screen.findByText(message)).toBeVisible();
    // Radix speaks the toast through a live region of its own, filled after the toast mounts.
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(message));
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is gone from the store once it has been dismissed", async () => {
    useBeerRemovedStore.getState().announce({ name: "Öö Bourbon" });
    render(withI18n(<CatalogToasts announceRemoval />));
    await screen.findByText("Öö Bourbon was removed from the catalog.");

    act(() => useBeerRemovedStore.getState().dismiss());

    expect(useBeerRemovedStore.getState().beer).toBeNull();
  });

  it("is not shown where the page does not announce removals", () => {
    useBeerRemovedStore.getState().announce({ name: "Öö Bourbon" });
    render(withI18n(<CatalogToasts />));

    expect(screen.queryByText("Öö Bourbon was removed from the catalog.")).not.toBeInTheDocument();
  });
});
