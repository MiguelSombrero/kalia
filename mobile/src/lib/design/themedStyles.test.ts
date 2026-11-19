import { renderHook } from "@testing-library/react-native";

import { systemIs } from "@/testing/colorMode";

import { settleFaces, textStyle, unsettleFaces } from "./fonts";
import { theme } from "./theme.generated";
import { createThemedStyles } from "./themedStyles";
import type { ThemeColors } from "./useThemeColors";

afterEach(() => {
  jest.restoreAllMocks();
  unsettleFaces();
});

describe("createThemedStyles", () => {
  it.each(["light", "dark"] as const)("hands the %s sheet out when the system is %s", async (mode) => {
    systemIs(mode);
    const useStyles = createThemedStyles((colors) => ({ card: { backgroundColor: colors.surface } }));

    const { result } = await renderHook(() => useStyles());

    expect(result.current.card.backgroundColor).toBe(theme.colors[mode].surface);
  });

  it("builds a mode's sheet when a render first asks for it, once, and hands the same one out on every render", async () => {
    systemIs("dark");
    const build = jest.fn((colors: ThemeColors) => ({ card: { backgroundColor: colors.surface } }));
    const useStyles = createThemedStyles(build);

    const { result, rerender } = await renderHook(() => useStyles());
    const first = result.current;
    await rerender({});

    expect(build).toHaveBeenCalledTimes(1);
    expect(result.current).toBe(first);
  });

  it("switches sheet when the system changes mode", async () => {
    const scheme = systemIs("light");
    const useStyles = createThemedStyles((colors) => ({ card: { backgroundColor: colors.surface } }));
    const { result, rerender } = await renderHook(() => useStyles());

    scheme.mockReturnValue("dark");
    await rerender({});

    expect(result.current.card.backgroundColor).toBe(theme.colors.dark.surface);
  });

  it("hands out a sheet in the bundled face only once the faces have settled, never one built before", async () => {
    const useStyles = createThemedStyles(() => ({ title: textStyle("screen-title", "bold") }));
    const { result, rerender } = await renderHook(() => useStyles());
    expect(result.current.title.fontFamily).toBeUndefined();
    expect(result.current.title.fontWeight).toBe("700");

    settleFaces(true);
    await rerender({});

    expect(result.current.title.fontFamily).toBe("BricolageGrotesque_700Bold");
    expect(result.current.title.fontWeight).toBeUndefined();
  });
});
