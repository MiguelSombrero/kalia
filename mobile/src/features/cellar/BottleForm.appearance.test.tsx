import { fireEvent, screen } from "@testing-library/react-native";
import { Dimensions, type ViewStyle } from "react-native";

import { EDGE } from "@/components/metrics";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { BottleForm } from "./BottleForm";

jest.mock("@react-native-community/datetimepicker", () => jest.requireActual("@/testing/datePickerMock").datePickerMock);

const BEER = { name: "Pöllönkorven Panimo Tervaleijona Imperial Stout Tynnyrikypsytetty", brewery: "Pöllönkorven Pienpanimo ja Mallasjalostamo Osuuskunta" };

const WINDOW = Dimensions.get("window");
const windowFontScale = (fontScale: number) => Dimensions.set({ window: { ...WINDOW, fontScale }, screen: Dimensions.get("screen") });

afterEach(() => {
  jest.restoreAllMocks();
  windowFontScale(WINDOW.fontScale);
});

const BOTTLE = { containerType: "CAN", brewedDate: "2023-05-12", bestBeforeDate: "2023-05-01" } as const;

describe("BottleForm appearance", () => {
  it.each(MODES)("writes a long Finnish beer and brewery name whole at the largest text size in %s", async (mode) => {
    systemIs(mode);
    await withLargestFont(async () => {
      await renderWithLocale(<BottleForm mode="add" beer={BEER} onSubmit={() => undefined} onCancel={() => undefined} />, "fi");
      await fireEvent.press(screen.getByRole("button", { name: "Panopäivä (valinnainen): Ei asetettu" }));

      expect(screen.getByText(BEER.name)).toBeOnTheScreen();
      expect(screen.getByText(BEER.brewery)).toBeOnTheScreen();
      expectScalesWithText();
    });
  });

  it.each<[number, ViewStyle["flexDirection"]]>([
    [1, "row"],
    [1.5, "column"],
  ])("lays the containers out at font scale %s as a %s", async (fontScale, flexDirection) => {
    windowFontScale(fontScale);
    await renderWithLocale(<BottleForm mode="add" beer={BEER} onSubmit={() => undefined} onCancel={() => undefined} />, "fi");

    expect(screen.getByLabelText("Pakkaus")).toHaveStyle({ flexDirection });
  });

  it.each([
    [1, { borderWidth: EDGE }],
    [1.5, { borderWidth: 0, marginHorizontal: -theme.spacing.medium }],
  ])("frames the calendar at font scale %s, and from the stacking size gives it the sheet's whole width", async (fontScale, frame) => {
    windowFontScale(fontScale);
    await renderWithLocale(<BottleForm mode="add" beer={BEER} onSubmit={() => undefined} onCancel={() => undefined} />, "fi");

    await fireEvent.press(screen.getByRole("button", { name: "Panopäivä (valinnainen): Ei asetettu" }));

    expect(screen.getByTestId("date-well")).toHaveStyle(frame);
  });

  it.each(MODES)("marks the chosen container and a refused day in the %s colours", async (mode) => {
    systemIs(mode);
    const colors = theme.colors[mode];
    await renderWithLocale(<BottleForm mode="edit" beer={BEER} bottle={BOTTLE} onSubmit={() => undefined} onCancel={() => undefined} />);

    await fireEvent.press(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByRole("button", { name: "Can" })).toHaveStyle({ backgroundColor: colors.accent });
    expect(await screen.findByText("Best before must be later than the brewed date.")).toHaveStyle({ color: colors.foreground });
    expect(screen.getByRole("button", { name: /^Best before .*, Best before must be later than the brewed date\.$/ })).toHaveStyle({ borderColor: colors.destructive });
    expect(screen.getByRole("button", { name: /^Brewed / })).toHaveStyle({ borderColor: colors.border });
    expect(screen.getByTestId("error-mark", { includeHiddenElements: true })).toHaveStyle({ backgroundColor: colors.destructive });
  });
});
