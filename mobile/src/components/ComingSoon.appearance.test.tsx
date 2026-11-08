import { screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { ComingSoon } from "./ComingSoon";

jest.mock("@/lib/design/theme.generated", () => {
  const { theme } = jest.requireActual("@/lib/design/theme.generated");
  return {
    theme: {
      ...theme,
      colors: { ...theme.colors, dark: { ...theme.colors.dark, foreground: "#123456" } },
    },
  };
});

it.each([
  ["light", "#121212"],
  ["dark", "#123456"],
] as const)("uses the %s semantic colors when the system selects %s", async (mode, expected) => {
  jest.spyOn(ReactNative, "useColorScheme").mockReturnValue(mode);
  await renderWithLocale(<ComingSoon heading="Cellar" />);
  expect(screen.getByRole("heading", { name: "Cellar" })).toHaveStyle({ color: expected });
  jest.restoreAllMocks();
});
