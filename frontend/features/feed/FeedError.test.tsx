import { act, render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

import { FeedError } from "./FeedError";

const renderError = (locale: Locale = "en") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });

  return render(
    <I18nextProvider i18n={i18n}>
      <FeedError />
    </I18nextProvider>,
  );
};

describe("FeedError", () => {
  it("says the feed could not be loaded, as an alert", async () => {
    const { container } = renderError();

    expect(screen.getByRole("alert")).toHaveTextContent("Couldn't load recent activity.");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("asks the server for the page again when the visitor tries again", () => {
    renderError();

    act(() => screen.getByRole("button", { name: "Try again" }).click());

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("speaks Finnish, with no a11y violations", async () => {
    const { container } = renderError("fi");

    expect(screen.getByRole("alert")).toHaveTextContent("Viimeaikaisen toiminnan lataus ei onnistunut.");
    expect(screen.getByRole("button", { name: "Yritä uudelleen" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
