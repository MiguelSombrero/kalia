import { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { fireEvent, screen } from "@testing-library/react-native";

import { expectAccessibleStructure } from "@/testing/expectAccessibleStructure";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { DateField } from "./DateField.android";

jest.mock("@react-native-community/datetimepicker", () => ({ __esModule: true, DateTimePickerAndroid: { open: jest.fn() } }));

const open = jest.mocked(DateTimePickerAndroid.open);
const LABEL = "Brewed (optional)";
const MAXIMUM = new Date(2026, 10, 28, 12);

beforeEach(() => open.mockClear());

const renderField = async (value: string | null) => {
  const onChange = jest.fn();
  await renderWithLocale(<DateField label={LABEL} value={value} maximumDate={MAXIMUM} onChange={onChange} open={false} onOpenChange={() => undefined} />);
  return onChange;
};

describe("DateField on Android", () => {
  it("opens the system's calendar from its row and takes the day picked there", async () => {
    const onChange = await renderField(null);

    await fireEvent.press(screen.getByRole("button", { name: `${LABEL}: Not set` }));

    const dialog = open.mock.calls[0]![0];
    expect(dialog).toMatchObject({ mode: "date", display: "calendar", maximumDate: MAXIMUM, neutralButton: undefined });
    dialog.onValueChange!({} as never, new Date(2025, 4, 12, 12));
    expect(onChange).toHaveBeenCalledWith("2025-05-12");
  });

  it("clears a set day from the dialog or from the button under the row", async () => {
    const onChange = await renderField("2025-05-12");

    await fireEvent.press(screen.getByRole("button", { name: `${LABEL}: May 12, 2025` }));
    const dialog = open.mock.calls[0]![0] as Extract<Parameters<typeof DateTimePickerAndroid.open>[0], { neutralButton?: unknown }>;
    expect(dialog.neutralButton).toEqual({ label: "Clear" });
    expect(dialog.value).toEqual(new Date(2025, 4, 12, 12));
    dialog.onNeutralButtonPress!();
    await fireEvent.press(screen.getByRole("button", { name: `Clear date: ${LABEL}` }));

    expect(onChange.mock.calls).toEqual([[null], [null]]);
    expectAccessibleStructure();
  });
});
