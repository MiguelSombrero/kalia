import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { startCatalogSignIn } = vi.hoisted(() => ({ startCatalogSignIn: vi.fn() }));
vi.mock("./actions", () => ({
  startCatalogSignIn,
  loadAddBeerOptionsAction: vi.fn(async () => ({ styles: ["IPA"], countries: [{ code: "FI", name: "Finland" }] })),
  findBreweriesAction: vi.fn(async () => []),
  listBreweryBeersAction: vi.fn(async () => []),
  addBeerAction: vi.fn(),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

import { AddBeerEntry } from "./AddBeerEntry";

const providers = (locale: Locale, children: ReactNode) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  return (
    <QueryClientProvider client={new QueryClient()}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
};

const renderEntry = async (props: Parameters<typeof AddBeerEntry>[0]) =>
  render(providers(props.locale, await AddBeerEntry(props)));

describe("AddBeerEntry", () => {
  it("opens the form from a search that found nothing, the term carried in", async () => {
    const { container } = await renderEntry({ locale: "en", search: { query: "Öö Bourbon" }, isSignedIn: true, placement: "empty" });

    expect(screen.getByText("Not in the catalog yet? You can add it from here.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
    fireEvent.click(screen.getByRole("button", { name: "Add a beer" }));
    expect(await screen.findByLabelText("Name")).toHaveValue("Öö Bourbon");
  });

  it("opens the form from under a search whose beers were not it", async () => {
    const { container } = await renderEntry({ locale: "en", search: { query: "Öö" }, isSignedIn: true, placement: "line" });

    expect(container).toHaveTextContent("Not the beer you were looking for? Add a beer");
    fireEvent.click(screen.getByRole("button", { name: "Add a beer" }));
    expect(await screen.findByLabelText("Name")).toHaveValue("Öö");
  });

  it.each(["empty", "line"] as const)(
    "invites a signed-out visitor to sign in, returning to the search, instead of a form that would fail (%s)",
    async (placement) => {
      const { container } = await renderEntry({
        locale: "en",
        search: { query: "Öö Bourbon", style: "Imperial Stout" },
        isSignedIn: false,
        placement,
      });

      expect(screen.queryByRole("button", { name: "Add a beer" })).not.toBeInTheDocument();
      const signIn = screen.getByRole("button", { name: placement === "empty" ? "Sign in" : "Sign in to add it" });
      const form = signIn.closest("form");
      expect(form).not.toBeNull();
      expect(new FormData(form!).get("query")).toBe("Öö Bourbon");
      expect(new FormData(form!).get("style")).toBe("Imperial Stout");
      expect(new FormData(form!).get("locale")).toBe("en");
      expect(await axe(container)).toHaveNoViolations();
    },
  );

  it("says so in Finnish, signed out", async () => {
    const { container } = await renderEntry({ locale: "fi", search: { query: "Öö" }, isSignedIn: false, placement: "empty" });

    expect(screen.getByText("Kirjaudu sisään, niin voit lisätä sen kaikkien nähtäväksi.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kirjaudu sisään" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
