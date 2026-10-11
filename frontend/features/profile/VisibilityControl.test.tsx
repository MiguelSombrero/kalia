import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { changeVisibilityAction } = vi.hoisted(() => ({ changeVisibilityAction: vi.fn() }));
vi.mock("./actions", () => ({ changeVisibilityAction }));

import { type CellarTotals, VisibilityControl } from "./VisibilityControl";

const counts: CellarTotals = { beers: 7, bottles: 12 };

const renderControl = (
  props: { initialCellarPublic: boolean; counts?: CellarTotals | null },
  locale: Locale = "en",
) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <VisibilityControl username="ada" counts={counts} {...props} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  changeVisibilityAction.mockReset();
});

describe("VisibilityControl", () => {
  it("reflects a private cellar, says what each choice shows, and offers no public address", async () => {
    const { container } = renderControl({ initialCellarPublic: false });

    expect(screen.getByRole("radiogroup", { name: "Who can see your cellar?" })).toBeInTheDocument();
    const onlyMe = screen.getByRole("radio", { name: "Only me" });
    expect(onlyMe).toBeChecked();
    expect(onlyMe).toHaveAccessibleDescription(/Its address shows Kalia's not-found page, to everyone/);
    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toHaveAccessibleDescription(
      /Your 7 beers and 12 bottles, with their dates.*including ones made while private.*Never your email/,
    );
    expect(screen.queryByRole("link", { name: "Open your public cellar" })).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("reflects a public cellar and shows its address", async () => {
    const { container } = renderControl({ initialCellarPublic: true });

    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();
    expect(screen.getByText("/cellars/ada")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open your public cellar" })).toHaveAttribute("href", "/cellars/ada");
    expect(await axe(container)).toHaveNoViolations();
  });

  it("describes the public choice without numbers when the cellar could not be counted", async () => {
    const { container } = renderControl({ initialCellarPublic: false, counts: null });

    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toHaveAccessibleDescription(
      /^Your beers and bottles, with their dates/,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("asks before publishing, and saves nothing when the visitor keeps the cellar private", async () => {
    const { container } = renderControl({ initialCellarPublic: false });

    fireEvent.click(screen.getByRole("radio", { name: "Anyone with the link" }));

    const question = screen.getByText("Publish your cellar?");
    await waitFor(() => expect(question).toHaveFocus());
    expect(screen.getByRole("radio", { name: "Only me" })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();

    fireEvent.click(screen.getByRole("button", { name: "Keep private" }));

    expect(screen.queryByText("Publish your cellar?")).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Only me" })).toBeChecked();
    expect(changeVisibilityAction).not.toHaveBeenCalled();
  });

  it("publishes once confirmed, and reports it in a toast", async () => {
    changeVisibilityAction.mockResolvedValue({ username: "ada", cellarPublic: true });
    const { container } = renderControl({ initialCellarPublic: false });

    fireEvent.click(screen.getByRole("radio", { name: "Anyone with the link" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish cellar" }));

    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();
    await waitFor(() => expect(changeVisibilityAction).toHaveBeenCalledWith(true));
    expect(await screen.findByText("Saved. Your cellar is public.")).toBeInTheDocument();
    expect(screen.getByText("/cellars/ada")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("locks both choices while a save is in flight, so two saves cannot overlap", async () => {
    let finish: (profile: unknown) => void = () => {};
    changeVisibilityAction.mockImplementation(() => new Promise((resolve) => (finish = resolve)));
    renderControl({ initialCellarPublic: true });

    fireEvent.click(screen.getByRole("radio", { name: "Only me" }));

    await waitFor(() => expect(screen.getByRole("radio", { name: "Anyone with the link" })).toBeDisabled());
    expect(screen.getByRole("radio", { name: "Only me" })).toBeDisabled();
    finish({ username: "ada", cellarPublic: false });
    await waitFor(() => expect(screen.getByRole("radio", { name: "Anyone with the link" })).toBeEnabled());
    expect(changeVisibilityAction).toHaveBeenCalledOnce();
  });

  it("makes the cellar private at once, without asking", async () => {
    changeVisibilityAction.mockResolvedValue({ username: "ada", cellarPublic: false });
    const { container } = renderControl({ initialCellarPublic: true });

    fireEvent.click(screen.getByRole("radio", { name: "Only me" }));

    expect(screen.queryByText("Publish your cellar?")).not.toBeInTheDocument();
    await waitFor(() => expect(changeVisibilityAction).toHaveBeenCalledWith(false));
    expect(await screen.findByText("Saved. Your cellar is private.")).toBeInTheDocument();
    expect(screen.queryByText("/cellars/ada")).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("rolls the displayed state back and reports the failure in a toast", async () => {
    changeVisibilityAction.mockRejectedValue(new Error("network down"));
    const { container } = renderControl({ initialCellarPublic: false });

    fireEvent.click(screen.getByRole("radio", { name: "Anyone with the link" }));
    fireEvent.click(screen.getByRole("button", { name: "Publish cellar" }));

    // Optimistic update shows immediately...
    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();

    // ...then rolls back once the mutation rejects.
    await waitFor(() => expect(screen.getByRole("radio", { name: "Only me" })).toBeChecked());
    expect(
      screen.getByText("Could not update your cellar visibility. Please try again."),
    ).toBeInTheDocument();
    expect(screen.queryByText(/^Saved\./)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("copies the public address and says so in a toast", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const { container } = renderControl({ initialCellarPublic: true });

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/cellars/ada`));
    expect(await screen.findByText("Link copied.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("reports a copy the browser refused as a failure", async () => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      configurable: true,
    });
    const { container } = renderControl({ initialCellarPublic: true });

    fireEvent.click(screen.getByRole("button", { name: "Copy link" }));

    expect(await screen.findByText("Could not copy the link. Please try again.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers no Copy link where the browser has no clipboard to copy to", async () => {
    Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
    const { container } = renderControl({ initialCellarPublic: true });

    expect(screen.queryByRole("button", { name: "Copy link" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open your public cellar" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the private state in Finnish with no a11y violations", async () => {
    const { container } = renderControl({ initialCellarPublic: false }, "fi");

    expect(screen.getByRole("radio", { name: "Vain minä" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Kuka tahansa linkin saanut" })).toHaveAccessibleDescription(
      /^7 olutta ja 12 pulloa päivämäärineen/,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the public state in Finnish with no a11y violations", async () => {
    const { container } = renderControl({ initialCellarPublic: true }, "fi");

    expect(screen.getByRole("radio", { name: "Kuka tahansa linkin saanut" })).toBeChecked();
    expect(screen.getByRole("link", { name: "Avaa julkinen kellarisi" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
