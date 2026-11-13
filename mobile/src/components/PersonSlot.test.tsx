import { screen } from "@testing-library/react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs } from "@/testing/colorMode";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { PersonSlot } from "./PersonSlot";

afterEach(() => jest.restoreAllMocks());

describe("PersonSlot", () => {
  it.each(MODES)("is the person's initials on the surface, with no colour of their own, in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(<PersonSlot name="sanna" />);

    expect(screen.getByText("SA", { includeHiddenElements: true })).toHaveStyle({ color: theme.colors[mode].foreground });
    expect(screen.getByText("SA", { includeHiddenElements: true }).parent).toHaveStyle({ backgroundColor: theme.colors[mode].surface, borderColor: theme.colors[mode].border });
  });

  it("is decorative: the name is written beside it", async () => {
    await renderWithLocale(<PersonSlot name="sanna" />);

    expect(screen.queryByText("SA")).not.toBeOnTheScreen();
  });
});
