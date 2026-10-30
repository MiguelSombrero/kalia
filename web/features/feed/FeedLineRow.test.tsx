import { render, screen, within } from "@testing-library/react";
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
  beerId: "0b7c5c8e-3f2a-4d7e-9a51-6c2e8f4b1d90",
  beerName: "AleSmith IPA",
  brewery: "AleSmith Brewing",
  style: "American IPA",
  abv: 7.25,
  quantity: 6,
  brewedDate: "2019-03-15",
  occurredAt: "2026-09-13T11:56:00.000Z",
  cursor: "cursor-1",
};

const renderLine = (
  feedLine: FeedLine,
  locale: Locale = "en",
  flags: { isOwn?: boolean; isFresh?: boolean } = {},
) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <ul>
        <FeedLineRow line={feedLine} locale={locale} now={now} {...flags} />
      </ul>
    </I18nextProvider>,
  );
};

describe("FeedLineRow", () => {
  it.each(["en", "fi"] as const)("links the username to the public cellar in %s", (locale) => {
    renderLine(line, locale);

    expect(screen.getByRole("link", { name: "MiguelSombrero" })).toHaveAttribute(
      "href",
      `/${locale}/cellars/MiguelSombrero`,
    );
  });

  it.each(["en", "fi"] as const)("links the beer's name to the beer's own page in %s", (locale) => {
    renderLine(line, locale);

    expect(screen.getByRole("link", { name: "AleSmith IPA" })).toHaveAttribute(
      "href",
      `/${locale}/beers/0b7c5c8e-3f2a-4d7e-9a51-6c2e8f4b1d90`,
    );
  });

  it("leads with a band in the beer's style colour carrying its strength, hidden from assistive technology", () => {
    const { container } = renderLine(line, "fi");

    const band = container.querySelector("li > [data-beer-style]");
    expect(band).toBe(screen.getByRole("listitem").firstElementChild);
    expect(band).toHaveAttribute("data-beer-style", "ipa");
    expect(band).toHaveAttribute("aria-hidden", "true");
    expect(band).toHaveTextContent("7,25%");
  });

  it("names the beer's style beside its brewery and reads its strength to assistive technology", () => {
    renderLine(line);

    const meta = screen.getByText(/^AleSmith Brewing · American IPA/);
    expect(meta).toHaveTextContent("AleSmith Brewing · American IPA, 7.25 % · vintage 2019");
    expect(within(meta).getByText(", 7.25 %")).toHaveClass("sr-only");
  });

  it("reads who added how many bottles before naming the beer, in English", () => {
    renderLine(line);

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent(/MiguelSombrero added 6 bottles · 4 minutes agoAleSmith IPA/);
  });

  it("leaves the vintage out when no brewed date was recorded", () => {
    renderLine({ ...line, quantity: 1, brewedDate: undefined });

    expect(screen.getByText("added 1 bottle")).toBeInTheDocument();
    expect(screen.getByText(/^AleSmith Brewing/)).toHaveTextContent(/^AleSmith Brewing · American IPA, 7.25 %$/);
  });

  it("reads who added how many bottles, in Finnish", () => {
    renderLine(line, "fi");

    expect(screen.getByText("lisäsi kellariinsa 6 pulloa")).toBeInTheDocument();
    expect(screen.getByText(/^AleSmith Brewing/)).toHaveTextContent(
      "AleSmith Brewing · American IPA, 7,25 % · vuosikerta 2019",
    );
  });

  it("shows the bottle count as a figure hidden from assistive technology, which reads it in the sentence", () => {
    renderLine(line);

    const figure = screen.getByText("6");
    expect(figure.closest("[aria-hidden='true']")).not.toBeNull();
    expect(screen.getByText("bottles")).toBeInTheDocument();
  });

  it("renders the exact instant in a machine-readable time element", () => {
    renderLine(line);

    expect(screen.getByText(/ago/)).toHaveAttribute("datetime", "2026-09-13T11:56:00.000Z");
  });

  it("tags the visitor's own entry, and only theirs", () => {
    const { unmount } = renderLine(line, "en", { isOwn: true });
    expect(screen.getByText("You")).toBeInTheDocument();
    unmount();

    renderLine(line);
    expect(screen.queryByText("You")).not.toBeInTheDocument();
  });

  it("highlights a freshly shown entry only when motion is allowed", () => {
    renderLine(line, "en", { isFresh: true });

    expect(screen.getByRole("listitem").className).toContain("motion-safe:animate-feed-reveal");
  });

  it("has no accessibility violations in English", async () => {
    const { container } = renderLine(line, "en", { isOwn: true });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no accessibility violations in Finnish", async () => {
    const { container } = renderLine(line, "fi", { isOwn: true });

    expect(await axe(container)).toHaveNoViolations();
  });
});
