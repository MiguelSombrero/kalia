import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import { AccessibilityInfo, type HostInstance, ScrollView, View } from "react-native";

import { expectAccessibleStructure } from "@/testing/expectAccessibleStructure";
import { layOut } from "@/testing/layOut";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { BottleForm } from "./BottleForm";
import { localToday } from "./bottles";

jest.mock("@react-native-community/datetimepicker", () => jest.requireActual("@/testing/datePickerMock").datePickerMock);

const BEER = { name: "Tervaleijona", brewery: "Pöllönkorpi" };
const BREWED = "Brewed (optional)";
const BEST_BEFORE = "Best before (optional)";
const NOT_AFTER = "Best before must be later than the brewed date.";

afterEach(() => jest.restoreAllMocks());

const renderAdd = async () => {
  const onSubmit = jest.fn();
  const onCancel = jest.fn();
  await renderWithLocale(<BottleForm mode="add" beer={BEER} onSubmit={onSubmit} onCancel={onCancel} />);
  return { onSubmit, onCancel };
};

const renderEdit = async (bottle: { containerType: "BOTTLE" | "CAN" | "KEG"; brewedDate: string | null; bestBeforeDate: string | null }) => {
  const onSubmit = jest.fn();
  await renderWithLocale(<BottleForm mode="edit" beer={BEER} bottle={bottle} onSubmit={onSubmit} onCancel={() => undefined} />);
  return { onSubmit };
};

const press = (name: string) => fireEvent.press(screen.getByRole("button", { name }));
const pickOnCalendar = (year: number, month: number, day: number) => fireEvent(screen.getByTestId("date-picker"), "valueChange", {}, new Date(year, month - 1, day, 12));
const enterDate = async (field: string, year: number, month: number, day: number) => {
  await fireEvent.press(screen.getByRole("button", { name: new RegExp(`^${field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}: `) }));
  await pickOnCalendar(year, month, day);
  await press(`Done: ${field}`);
};

describe("BottleForm adding", () => {
  it("names the beer and every control, with bottle chosen, one of them, and no dates", async () => {
    await renderAdd();

    expect(screen.getByRole("heading", { name: "Add bottles" })).toBeOnTheScreen();
    expect(screen.getByText("Tervaleijona")).toBeOnTheScreen();
    expect(screen.getByText("Pöllönkorpi")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Bottle" })).toBeSelected();
    expect(screen.getByRole("button", { name: "Can" })).not.toBeSelected();
    expect(screen.getByRole("button", { name: "Keg" })).not.toBeSelected();
    expect(screen.getByLabelText("How many: 1")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "One fewer" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "One more" })).toBeEnabled();
    expect(screen.getByRole("button", { name: `${BREWED}: Not set` })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: `${BEST_BEFORE}: Not set` })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeOnTheScreen();
    expectAccessibleStructure();
  });

  it("reports the chosen container, quantity and days once", async () => {
    const { onSubmit } = await renderAdd();

    await press("Can");
    await press("One more");
    await press("One more");
    await enterDate(BREWED, 2025, 5, 12);
    await enterDate(BEST_BEFORE, 2028, 5, 12);
    expect(screen.getByRole("button", { name: `${BREWED}: May 12, 2025` })).toBeOnTheScreen();
    await press("Add");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls).toEqual([[{ containerType: "CAN", quantity: 3, brewedDate: "2025-05-12", bestBeforeDate: "2028-05-12" }]]);
  });

  it("reports both dates as none when none was entered", async () => {
    const { onSubmit } = await renderAdd();

    await press("Add");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls).toEqual([[{ containerType: "BOTTLE", quantity: 1, brewedDate: null, bestBeforeDate: null }]]);
  });

  it("stops the quantity at twenty-four and at one, saying each new count", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const { onSubmit } = await renderAdd();

    for (let count = 1; count < 24; count += 1) await press("One more");

    expect(screen.getByLabelText("How many: 24")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "One more" })).toBeDisabled();
    expect(announce).toHaveBeenLastCalledWith("How many: 24");
    await press("One more");
    await press("Add");
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].quantity).toBe(24);
    for (let count = 24; count > 1; count -= 1) await press("One fewer");
    expect(screen.getByRole("button", { name: "One fewer" })).toBeDisabled();
    expect(screen.getByLabelText("How many: 1")).toBeOnTheScreen();
  });

  it("refuses a best-before day that is not after the brewed day, whichever was entered last, until it is", async () => {
    const announce = jest.spyOn(AccessibilityInfo, "announceForAccessibility");
    const { onSubmit } = await renderAdd();

    await enterDate(BEST_BEFORE, 2025, 5, 12);
    await enterDate(BREWED, 2025, 5, 12);

    expect(await screen.findByRole("alert", { name: NOT_AFTER })).toBeOnTheScreen();
    expect(announce).toHaveBeenCalledWith(NOT_AFTER);
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();
    await press("Add");
    expect(onSubmit).not.toHaveBeenCalled();

    await enterDate(BEST_BEFORE, 2025, 5, 13);

    await waitFor(() => expect(screen.queryByText(NOT_AFTER)).toBeNull());
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  it("scrolls the sheet so that a calendar opened below the view is shown whole", async () => {
    jest.spyOn(View.prototype as unknown as HostInstance, "measureLayout").mockImplementation((_relativeTo, onSuccess) => onSuccess(0, 500, 320, 450));
    const scrollTo = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: () => void }, "scrollTo").mockClear();
    await renderAdd();

    await press(`${BEST_BEFORE}: Not set`);
    await layOut(screen.getByTestId("date-well"));

    expect(scrollTo).toHaveBeenCalledTimes(1);
  });

  it("offers the calendar no brewed day after today, and leaves best-before open", async () => {
    await renderAdd();

    await press(`${BREWED}: Not set`);
    const today = screen.getByTestId("date-picker").props.maximumDate as Date;
    expect([today.getFullYear(), today.getMonth(), today.getDate()]).toEqual(localToday().split("-").map(Number).map((part, index) => (index === 1 ? part - 1 : part)));
    await press(`${BEST_BEFORE}: Not set`);

    expect(screen.getAllByTestId("date-picker")).toHaveLength(1);
    expect(screen.getByTestId("date-picker").props.maximumDate).toBeUndefined();
    expect(screen.getByTestId("date-picker").props.accessibilityLabel).toBe(BEST_BEFORE);
  });

  it("records the day the calendar shows on Done, and nothing on Cancel", async () => {
    const { onSubmit } = await renderAdd();

    await press(`${BREWED}: Not set`);
    await press(`Cancel: ${BREWED}`);
    expect(screen.queryByTestId("date-picker")).toBeNull();
    expect(screen.getByRole("button", { name: `${BREWED}: Not set` })).toBeOnTheScreen();
    await press(`${BREWED}: Not set`);
    expectAccessibleStructure();
    await press(`Done: ${BREWED}`);
    await press("Add");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].brewedDate).toBe(localToday());
  });

  it("leaves without reporting anything on Cancel", async () => {
    const { onSubmit, onCancel } = await renderAdd();

    await press("Cancel");
    await act(async () => undefined);

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("speaks Finnish, dates included", async () => {
    await renderWithLocale(<BottleForm mode="add" beer={BEER} onSubmit={() => undefined} onCancel={() => undefined} />, "fi");

    await press("Panopäivä (valinnainen): Ei asetettu");
    await pickOnCalendar(2025, 5, 12);

    expect(screen.getByRole("heading", { name: "Lisää pulloja" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Tölkki" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Yksi lisää" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Panopäivä (valinnainen): 12.5.2025" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Tyhjennä päivä: Panopäivä (valinnainen)" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Valmis: Panopäivä (valinnainen)" })).toBeOnTheScreen();
    expect(screen.getByTestId("date-picker").props.locale).toBe("fi");
    expect(screen.getByRole("button", { name: "Lisää" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Peruuta" })).toBeOnTheScreen();
  });
});

describe("BottleForm editing", () => {
  const BOTTLE = { containerType: "CAN", brewedDate: "2023-05-12", bestBeforeDate: "2028-05-12" } as const;

  it("starts from the bottle, with no quantity", async () => {
    await renderEdit(BOTTLE);

    expect(screen.getByRole("heading", { name: "Edit bottle" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Can" })).toBeSelected();
    expect(screen.getByRole("button", { name: `${BREWED}: May 12, 2023` })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: `${BEST_BEFORE}: May 12, 2028` })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: "One more" })).toBeNull();
    expectAccessibleStructure();
  });

  it("reports the container and both days, never a quantity, with a cleared day as none", async () => {
    const { onSubmit } = await renderEdit(BOTTLE);

    await press("Keg");
    await press(`Clear date: ${BREWED}`);
    await press("Save");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls).toEqual([[{ containerType: "KEG", brewedDate: null, bestBeforeDate: "2028-05-12" }]]);
  });

  it("clears a day from inside its open calendar", async () => {
    await renderEdit(BOTTLE);

    await press(`${BREWED}: May 12, 2023`);
    await press(`Clear date: ${BREWED}`);

    expect(screen.queryByTestId("date-picker")).toBeNull();
    expect(screen.getByRole("button", { name: `${BREWED}: Not set` })).toBeOnTheScreen();
  });

  it("refuses to save a brewed day in the future", async () => {
    const { onSubmit } = await renderEdit({ ...BOTTLE, brewedDate: "2999-01-01", bestBeforeDate: null });

    await press("Save");

    expect(await screen.findByText("A brewed date cannot be in the future.")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("saves back a container this build does not know, with none of the three chosen", async () => {
    const { onSubmit } = await renderEdit({ ...BOTTLE, containerType: "CRATE" as never });

    for (const name of ["Bottle", "Can", "Keg"]) expect(screen.getByRole("button", { name })).not.toBeSelected();
    await press("Save");

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0]![0].containerType).toBe("CRATE");
  });
});
