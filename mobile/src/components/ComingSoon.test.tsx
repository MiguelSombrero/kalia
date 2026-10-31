import { screen } from "@testing-library/react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ComingSoon } from "./ComingSoon";

describe("ComingSoon", () => {
  it.each([
    ["en", "Coming soon"],
    ["fi", "Tulossa pian"],
  ] as const)("shows the heading it is given and the notice in %s", async (locale, notice) => {
    await renderWithLocale(<ComingSoon heading="Cellar" />, locale);

    expect(screen.getByRole("heading", { name: "Cellar" })).toBeOnTheScreen();
    expect(screen.getByText(notice)).toBeOnTheScreen();
  });

  it("lets its text scale with the system font size", async () => {
    await renderWithLocale(<ComingSoon heading="Cellar" />);

    expect(screen.getByRole("heading", { name: "Cellar" }).props.allowFontScaling).not.toBe(false);
    expect(screen.getByText("Coming soon").props.allowFontScaling).not.toBe(false);
  });
});
