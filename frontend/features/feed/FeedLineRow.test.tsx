import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";
import { FeedLineRow } from "./FeedLineRow";
import type { FeedLine } from "./types";

const now = new Date("2026-09-13T12:00:00.000Z");

const line: FeedLine = {
  username: "MiguelSombrero",
  beerName: "AleSmith IPA",
  brewery: "AleSmith Brewing",
  quantity: 6,
  brewedDate: "2019-03-15",
  occurredAt: "2026-09-13T11:56:00.000Z",
  cursor: "cursor-1",
};

const renderLine = (feedLine: FeedLine, locale: Locale = "en") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <ul>
        <FeedLineRow line={feedLine} locale={locale} now={now} />
      </ul>
    </I18nextProvider>,
  );
};

describe("FeedLineRow", () => {
  it("links the username to the public cellar", () => {
    renderLine(line);

    expect(screen.getByRole("link", { name: "MiguelSombrero" })).toHaveAttribute(
      "href",
      "/cellars/MiguelSombrero",
    );
  });

  it("reads as a sentence naming the count, vintage and beer, in English", () => {
    renderLine(line);

    expect(
      screen.getByText("added 6 bottles of a 2019 AleSmith IPA to their cellar"),
    ).toBeInTheDocument();
  });

  it("omits the vintage clause when no brewed date was recorded", () => {
    renderLine({ ...line, quantity: 1, brewedDate: undefined });

    expect(screen.getByText("added 1 bottle of AleSmith IPA to their cellar")).toBeInTheDocument();
  });

  it("reads as a sentence naming the count, vintage and beer, in Finnish", () => {
    renderLine(line, "fi");

    expect(
      screen.getByText("lisäsi kellariinsa 6 pulloa vuoden 2019 olutta AleSmith IPA"),
    ).toBeInTheDocument();
  });

  it("renders the exact instant in a machine-readable time element", () => {
    renderLine(line);

    expect(screen.getByText(/ago/)).toHaveAttribute("datetime", "2026-09-13T11:56:00.000Z");
  });

  it("has no accessibility violations in English", async () => {
    const { container } = renderLine(line);

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations in Finnish", async () => {
    const { container } = renderLine(line, "fi");

    expect(await axe(container)).toHaveNoViolations();
  });
});
