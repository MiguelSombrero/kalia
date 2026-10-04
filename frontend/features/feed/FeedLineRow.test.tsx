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
  it("links the username to the public cellar", () => {
    renderLine(line);

    expect(screen.getByRole("link", { name: "MiguelSombrero" })).toHaveAttribute(
      "href",
      "/cellars/MiguelSombrero",
    );
  });

  it("links the beer's name to a catalog search for it", () => {
    renderLine(line);

    expect(screen.getByRole("link", { name: "AleSmith IPA" })).toHaveAttribute(
      "href",
      "/en/beers?query=AleSmith%20IPA",
    );
  });

  it("reads who added how many bottles before naming the beer, in English", () => {
    renderLine(line);

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent(/MiguelSombrero added 6 bottles · 4 minutes agoAleSmith IPA/);
    expect(screen.getByText("AleSmith Brewing · vintage 2019")).toBeInTheDocument();
  });

  it("names the brewery alone when no brewed date was recorded", () => {
    renderLine({ ...line, quantity: 1, brewedDate: undefined });

    expect(screen.getByText("added 1 bottle")).toBeInTheDocument();
    expect(screen.getByText("AleSmith Brewing")).toBeInTheDocument();
  });

  it("reads who added how many bottles, in Finnish", () => {
    renderLine(line, "fi");

    expect(screen.getByText("lisäsi kellariinsa 6 pulloa")).toBeInTheDocument();
    expect(screen.getByText("AleSmith Brewing · vuosikerta 2019")).toBeInTheDocument();
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
