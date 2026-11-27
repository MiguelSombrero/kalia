import { screen } from "@testing-library/react-native";

import { entryOf } from "@/testing/cellarEntries";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { BottleRow } from "./BottleRow";
import type { Bottle } from "./types";

const bottleOf = (container: string, brewed = "2024-03-10", bestBefore = "2027-03-10") =>
  ({ ...entryOf({ id: "1", bottles: [{ brewed, bestBefore }] }).bottles[0]!, containerType: container }) as Bottle;

describe("BottleRow", () => {
  it.each([
    ["BOTTLE", "en", "Bottle"],
    ["CAN", "en", "Can"],
    ["KEG", "en", "Keg"],
    ["CAN", "fi", "Tölkki"],
    ["KEG", "fi", "Tynnyri"],
    ["GROWLER", "en", "Other"],
  ] as const)("names a %s in %s as %s and draws a picture for it that assistive technology never sees", async (container, locale, word) => {
    await renderWithLocale(<BottleRow bottle={bottleOf(container)} today="2026-11-23" language={locale} />, locale);

    expect(screen.getByRole("listitem", { name: new RegExp(`^${word},`) })).toBeOnTheScreen();
    expect(screen.getByTestId("container-icon", { includeHiddenElements: true })).toHaveProp("accessibilityElementsHidden", true);
  });

  it.each([
    ["en", "Vintage 2024, Best before Mar 10, 2027, Brewed Mar 10, 2024"],
    ["fi", "Vuosikerta 2024, Parasta ennen 10.3.2027, Panopäivä 10.3.2024"],
  ] as const)("reads a bottle's vintage and both dates in %s", async (locale, spoken) => {
    await renderWithLocale(<BottleRow bottle={bottleOf("BOTTLE")} today="2026-11-23" language={locale} />, locale);

    expect(screen.getByRole("listitem", { name: new RegExp(spoken.replaceAll(".", "\\.")) })).toBeOnTheScreen();
    expect(screen.getByText("2024")).toBeOnTheScreen();
  });

  it("marks a bottle past its best-before date with a tag in Finnish", async () => {
    await renderWithLocale(<BottleRow bottle={bottleOf("BOTTLE", "2023-02-14", "2026-02-14")} today="2026-11-23" language="fi" />, "fi");

    expect(screen.getByText("Yli parasta ennen")).toBeOnTheScreen();
    expect(screen.getByRole("listitem", { name: /Yli parasta ennen, Panopäivä/ })).toBeOnTheScreen();
  });
});
