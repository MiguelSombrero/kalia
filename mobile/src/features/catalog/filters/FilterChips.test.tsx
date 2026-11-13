import { fireEvent, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { expectScalesWithText } from "@/testing/expectScalesWithText";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { FilterChips } from "./FilterChips";
import { emptyFilters, type Filters } from "./model";

const all: Filters = { ...emptyFilters(), style: "IPA", breweryId: "b1", breweryName: "Maku Brewing", countryCode: "FI", min: "4,5", max: "7", sort: "abv,desc" };

describe("FilterChips", () => {
  it("shows nothing while no filter is in force", async () => {
    await renderWithLocale(<FilterChips filters={emptyFilters()} onRemove={jest.fn()} onClearAll={jest.fn()} />);

    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  it.each([
    ["style", "Remove filter: IPA"],
    ["brewery", "Remove filter: Maku Brewing"],
    ["country", "Remove filter: Finland"],
    ["strength", "Remove filter: 4.5–7 %"],
    ["sort", "Remove filter: Strength (high → low)"],
  ])("removes the %s filter with a button named for it", async (key, name) => {
    const onRemove = jest.fn();
    await renderWithLocale(<FilterChips filters={all} onRemove={onRemove} onClearAll={jest.fn()} />);

    await fireEvent.press(screen.getByRole("button", { name }));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith(key);
  });

  it("clears them all", async () => {
    const onClearAll = jest.fn();
    await renderWithLocale(<FilterChips filters={all} onRemove={jest.fn()} onClearAll={onClearAll} />);

    await fireEvent.press(screen.getByRole("button", { name: "Clear all" }));

    expect(onClearAll).toHaveBeenCalledTimes(1);
  });

  it.each([
    [{ min: "5" }, "at least 5 %"],
    [{ max: "7" }, "at most 7 %"],
  ])("words a one-sided strength %j as %s", async (range, label) => {
    await renderWithLocale(<FilterChips filters={{ ...emptyFilters(), ...range }} onRemove={jest.fn()} onClearAll={jest.fn()} />);

    expect(screen.getByRole("button", { name: `Remove filter: ${label}` })).toBeOnTheScreen();
  });

  it("does not show a strength the sheet would refuse", async () => {
    await renderWithLocale(<FilterChips filters={{ ...emptyFilters(), min: "9", max: "5" }} onRemove={jest.fn()} onClearAll={jest.fn()} />);

    expect(screen.queryByRole("button")).not.toBeOnTheScreen();
  });

  it("reads long Finnish names in full at the largest font scale, wrapping rather than cutting", async () => {
    jest.spyOn(ReactNative, "useWindowDimensions").mockReturnValue({ width: 402, height: 874, scale: 3, fontScale: 3.1 });
    jest.spyOn(ReactNative.PixelRatio, "getFontScale").mockReturnValue(3.12);
    const long: Filters = { ...emptyFilters(), style: "Belgian Strong Golden Ale", breweryId: "b9", breweryName: "Santalahden ja Onkiniemen Osake-Oluttehdas", countryCode: "GB", min: "4,5", sort: "style,asc" };

    await renderWithLocale(<FilterChips filters={long} onRemove={jest.fn()} onClearAll={jest.fn()} />, "fi");

    expect(screen.getByText("Belgian Strong Golden Ale")).toBeOnTheScreen();
    expect(screen.getByText("Santalahden ja Onkiniemen Osake-Oluttehdas")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Poista suodatin: Iso-Britannia" })).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Poista suodatin: vähintään 4,5 %" })).toBeOnTheScreen();
    expect(screen.getByText("Järjestys: Tyyli (A–Ö)")).toBeOnTheScreen();
    expectScalesWithText();
  });
});
