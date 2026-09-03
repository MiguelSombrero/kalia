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

import { VisibilityControl } from "./VisibilityControl";

const renderControl = (
  props: { username: string; initialCellarPublic: boolean },
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
        <VisibilityControl {...props} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  changeVisibilityAction.mockReset();
});

describe("VisibilityControl", () => {
  it("reflects a private cellar and offers no public link", () => {
    renderControl({ username: "ada", initialCellarPublic: false });

    expect(screen.getByRole("radio", { name: "Only me" })).toBeChecked();
    expect(screen.getByText("Only you can see your cellar.")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "View your public cellar" })).not.toBeInTheDocument();
  });

  it("reflects a public cellar and links to it", () => {
    renderControl({ username: "ada", initialCellarPublic: true });

    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();
    expect(screen.getByText("Anyone with the link can see your cellar.")).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "View your public cellar" });
    expect(link).toHaveAttribute("href", "/cellars/ada");
  });

  it("applies the change immediately, with no confirmation step", async () => {
    changeVisibilityAction.mockResolvedValue({ username: "ada", cellarPublic: true });
    renderControl({ username: "ada", initialCellarPublic: false });

    fireEvent.click(screen.getByRole("radio", { name: "Anyone with the link" }));

    expect(screen.getByText("Anyone with the link can see your cellar.")).toBeInTheDocument();
    await waitFor(() => expect(changeVisibilityAction).toHaveBeenCalledWith(true));
  });

  it("rolls the displayed state back and surfaces a toast when the change fails", async () => {
    changeVisibilityAction.mockRejectedValue(new Error("network down"));
    renderControl({ username: "ada", initialCellarPublic: false });

    fireEvent.click(screen.getByRole("radio", { name: "Anyone with the link" }));

    // Optimistic update shows immediately...
    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toBeChecked();

    // ...then rolls back once the mutation rejects.
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Only me" })).toBeChecked(),
    );
    expect(screen.getByText("Only you can see your cellar.")).toBeInTheDocument();
    expect(
      screen.getByText("Could not update your cellar visibility. Please try again."),
    ).toBeInTheDocument();
  });

  it("renders the private state in Finnish with no a11y violations", async () => {
    const { container } = renderControl({ username: "ada", initialCellarPublic: false }, "fi");

    expect(screen.getByRole("radio", { name: "Vain minä" })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the public state in Finnish with no a11y violations", async () => {
    const { container } = renderControl({ username: "ada", initialCellarPublic: true }, "fi");

    expect(screen.getByRole("radio", { name: "Kuka tahansa linkin saanut" })).toBeChecked();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the private state in English with no a11y violations", async () => {
    const { container } = renderControl({ username: "ada", initialCellarPublic: false });

    expect(await axe(container)).toHaveNoViolations();
  });

  it("renders the public state in English with no a11y violations", async () => {
    const { container } = renderControl({ username: "ada", initialCellarPublic: true });

    expect(await axe(container)).toHaveNoViolations();
  });
});
