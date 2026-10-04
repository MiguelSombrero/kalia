import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";
import { CellarSummary } from "./CellarSummary";

const renderSummary = (
  props: { counts: { bottles: number; beers: number } | null; cellarPublic: boolean },
  locale: Locale = "en",
) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <CellarSummary locale={locale} {...props} />
    </I18nextProvider>,
  );
};

describe("CellarSummary", () => {
  it("shows the visitor's bottle and beer counts under their cellar's heading", async () => {
    const { container } = renderSummary({ counts: { bottles: 31, beers: 14 }, cellarPublic: true });

    expect(screen.getByRole("heading", { level: 2, name: "My cellar" })).toBeInTheDocument();
    expect(screen.getByText("31").parentElement).toHaveTextContent("31bottles");
    expect(screen.getByText("14").parentElement).toHaveTextContent("14beers");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("uses the singular for one bottle of one beer, in both languages", () => {
    const { unmount } = renderSummary({ counts: { bottles: 1, beers: 1 }, cellarPublic: true });
    expect(screen.getByText("bottle")).toBeInTheDocument();
    expect(screen.getByText("beer")).toBeInTheDocument();
    unmount();

    renderSummary({ counts: { bottles: 1, beers: 1 }, cellarPublic: true }, "fi");
    expect(screen.getByText("pullo")).toBeInTheDocument();
    expect(screen.getByText("olut")).toBeInTheDocument();
  });

  it("leaves the figures out when the cellar could not be read", () => {
    renderSummary({ counts: null, cellarPublic: true });

    expect(screen.queryByText("bottles")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open my cellar" })).toBeInTheDocument();
  });

  it("says a public cellar's additions appear on the front page, and opens the cellar", () => {
    renderSummary({ counts: { bottles: 2, beers: 1 }, cellarPublic: true });

    expect(
      screen.getByText(
        "Anyone with the link can see your cellar, and your additions appear on Kalia's front page.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open my cellar" })).toHaveAttribute("href", "/en/cellar");
  });

  it("explains a private cellar and links to where it can be made public", async () => {
    const { container } = renderSummary({ counts: { bottles: 2, beers: 1 }, cellarPublic: false }, "fi");

    expect(screen.getByRole("link", { name: "Tee kellarisi julkiseksi" })).toHaveAttribute(
      "href",
      "/fi/profile",
    );
    expect(screen.getByRole("link", { name: "Avaa kellari" })).toHaveAttribute("href", "/fi/cellar");
    expect(await axe(container)).toHaveNoViolations();
  });
});
