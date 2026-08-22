import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { addBottlesAction } = vi.hoisted(() => ({ addBottlesAction: vi.fn() }));
vi.mock("./actions", () => ({ addBottlesAction, listCellarBottlesAction: vi.fn() }));

import { AddBottleDialog } from "./AddBottleDialog";

const created = [
  {
    id: "bottle-1",
    entryId: "e1",
    containerType: "BOTTLE" as const,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const renderDialog = (locale: Locale = "en") => {
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
        <AddBottleDialog beerId="beer-1" beerName="Westvleteren 12" />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

const openDialog = async (locale: Locale = "en") => {
  const rendered = renderDialog(locale);
  const trigger = screen.getByRole("button", {
    name: locale === "en" ? "Add to cellar" : "Lisää kellariin",
  });
  fireEvent.click(trigger);
  await screen.findByRole("dialog");
  return { ...rendered, trigger };
};

const submit = (name = "Add") => fireEvent.click(screen.getByRole("button", { name }));

const quantityField = () => screen.getByRole("spinbutton", { name: /How many|Kuinka monta/ });

beforeEach(() => {
  addBottlesAction.mockReset();
  addBottlesAction.mockResolvedValue(created);
});

describe("AddBottleDialog", () => {
  it("keeps the form closed until the trigger is clicked", () => {
    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds one bottle with only a container type chosen", async () => {
    await openDialog();

    submit();

    await waitFor(() =>
      expect(addBottlesAction).toHaveBeenCalledWith({
        beerId: "beer-1",
        containerType: "BOTTLE",
        quantity: 1,
        brewedDate: undefined,
        bestBeforeDate: undefined,
      }),
    );
  });

  it("sends the dates it was given, and closes on success", async () => {
    await openDialog();

    fireEvent.change(screen.getByLabelText("Brewed (optional)"), {
      target: { value: "2024-01-01" },
    });
    fireEvent.change(screen.getByLabelText("Best before (optional)"), {
      target: { value: "2027-01-01" },
    });
    submit();

    await waitFor(() =>
      expect(addBottlesAction).toHaveBeenCalledWith(
        expect.objectContaining({ brewedDate: "2024-01-01", bestBeforeDate: "2027-01-01" }),
      ),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("adds several identical bottles in one submission", async () => {
    await openDialog();

    fireEvent.click(screen.getByRole("button", { name: "One more" }));
    fireEvent.click(screen.getByRole("button", { name: "One more" }));
    expect(quantityField()).toHaveValue(3);

    submit();

    await waitFor(() =>
      expect(addBottlesAction).toHaveBeenCalledWith(expect.objectContaining({ quantity: 3 })),
    );
  });

  it("stops the stepper at both ends of the allowed range", async () => {
    await openDialog();

    expect(screen.getByRole("button", { name: "One fewer" })).toBeDisabled();

    fireEvent.change(quantityField(), { target: { value: "24" } });
    await waitFor(() => expect(screen.getByRole("button", { name: "One more" })).toBeDisabled());
  });

  it("rejects a quantity above the allowed range before submitting", async () => {
    await openDialog();

    fireEvent.change(quantityField(), { target: { value: "25" } });
    submit();

    expect(await screen.findByText("Choose between 1 and 24 bottles.")).toBeInTheDocument();
    expect(addBottlesAction).not.toHaveBeenCalled();
  });

  it("rejects a best-before date at or before the brewed date before submitting", async () => {
    await openDialog();

    fireEvent.change(screen.getByLabelText("Brewed (optional)"), {
      target: { value: "2024-06-01" },
    });
    fireEvent.change(screen.getByLabelText("Best before (optional)"), {
      target: { value: "2024-06-01" },
    });
    submit();

    expect(
      await screen.findByText("Best before must be later than the brewed date."),
    ).toBeInTheDocument();
    expect(addBottlesAction).not.toHaveBeenCalled();
  });

  it("keeps the dialog open and reports a failed add", async () => {
    addBottlesAction.mockRejectedValue(new Error("boom"));
    await openDialog();

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not add to your cellar. Please try again.",
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const { trigger } = await openDialog();

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it.each([
    ["en", "Add to cellar"],
    ["fi", "Lisää kellariin"],
  ])("opens with no a11y violations in %s", async (locale, title) => {
    await openDialog(locale as Locale);

    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    // The dialog renders in a portal on document.body, outside `container`.
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("shows its validation errors with no a11y violations", async () => {
    await openDialog();

    fireEvent.change(quantityField(), { target: { value: "0" } });
    submit();
    await screen.findByText("Choose between 1 and 24 bottles.");

    expect(quantityField()).toHaveAttribute("aria-invalid", "true");
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
