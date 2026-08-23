import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { updateBottleAction } = vi.hoisted(() => ({ updateBottleAction: vi.fn() }));
vi.mock("./actions", () => ({
  updateBottleAction,
  listCellarBottlesAction: vi.fn(),
}));

import { EditBottleDialog } from "./EditBottleDialog";
import type { Bottle } from "./types";

const bottle: Bottle = {
  id: "bottle-1",
  entryId: "e1",
  containerType: "BOTTLE",
  brewedDate: "2024-01-01",
  bestBeforeDate: "2027-01-01",
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};

const renderDialog = (locale: Locale = "en", initialBottle: Bottle = bottle) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const tree = (forBottle: Bottle) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <EditBottleDialog bottle={forBottle} beerName="Westvleteren 12" />
      </I18nextProvider>
    </QueryClientProvider>
  );

  const rendered = render(tree(initialBottle));
  return {
    ...rendered,
    rerenderWithBottle: (nextBottle: Bottle) => rendered.rerender(tree(nextBottle)),
  };
};

const openDialog = async (locale: Locale = "en") => {
  const rendered = renderDialog(locale);
  const trigger = screen.getByRole("button", { name: locale === "en" ? "Edit" : "Muokkaa" });
  fireEvent.click(trigger);
  await screen.findByRole("dialog");
  return { ...rendered, trigger };
};

const submit = (name = "Save") => fireEvent.click(screen.getByRole("button", { name }));

beforeEach(() => {
  updateBottleAction.mockReset();
  updateBottleAction.mockResolvedValue({ ...bottle, containerType: "CAN" });
});

describe("EditBottleDialog", () => {
  it("keeps the form closed until the trigger is clicked", () => {
    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("prefills the form with the bottle's current values", async () => {
    await openDialog();

    expect(screen.getByLabelText("Container")).toHaveValue("BOTTLE");
    expect(screen.getByLabelText("Brewed (optional)")).toHaveValue("2024-01-01");
    expect(screen.getByLabelText("Best before (optional)")).toHaveValue("2027-01-01");
  });

  it("reflects the latest bottle values on reopen, not the ones from first mount", async () => {
    const { rerenderWithBottle } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    // Simulates the parent re-rendering with the updated bottle once the
    // edit's query invalidation refetches — same component instance, new
    // props, not a remount.
    rerenderWithBottle({ ...bottle, containerType: "CAN", brewedDate: "2024-06-01" });

    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    await screen.findByRole("dialog");

    expect(screen.getByLabelText("Container")).toHaveValue("CAN");
    expect(screen.getByLabelText("Brewed (optional)")).toHaveValue("2024-06-01");
  });

  it("submits the edited container type and dates, closing on success", async () => {
    await openDialog();

    fireEvent.change(screen.getByLabelText("Container"), { target: { value: "CAN" } });
    fireEvent.change(screen.getByLabelText("Brewed (optional)"), {
      target: { value: "2024-06-01" },
    });
    fireEvent.change(screen.getByLabelText("Best before (optional)"), {
      target: { value: "2027-06-01" },
    });
    submit();

    await waitFor(() =>
      expect(updateBottleAction).toHaveBeenCalledWith("bottle-1", {
        containerType: "CAN",
        brewedDate: "2024-06-01",
        bestBeforeDate: "2027-06-01",
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("rejects a best-before date at or before the brewed date before submitting", async () => {
    await openDialog();

    fireEvent.change(screen.getByLabelText("Best before (optional)"), {
      target: { value: "2024-01-01" },
    });
    submit();

    expect(
      await screen.findByText("Best before must be later than the brewed date."),
    ).toBeInTheDocument();
    expect(updateBottleAction).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and reports a failed edit", async () => {
    updateBottleAction.mockRejectedValue(new Error("boom"));
    await openDialog();

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save changes. Please try again.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it.each([
    ["en", "Edit bottle"],
    ["fi", "Muokkaa pulloa"],
  ])("opens with no a11y violations in %s", async (locale, title) => {
    await openDialog(locale as Locale);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    // The dialog renders in a portal on document.body, outside `container`.
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
