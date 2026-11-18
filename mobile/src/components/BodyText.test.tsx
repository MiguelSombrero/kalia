import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs } from "@/testing/colorMode";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { BodyText } from "./BodyText";

afterEach(() => jest.restoreAllMocks());

describe("BodyText", () => {
  it.each(MODES)("takes its colour from its tone in %s", async (mode) => {
    systemIs(mode);
    const colors = theme.colors[mode];
    await renderWithLocale(
      <>
        <BodyText>ink</BodyText>
        <BodyText tone="muted">quiet</BodyText>
        <BodyText tone="error">wrong</BodyText>
      </>,
    );

    expect(screen.getByText("ink")).toHaveStyle({ color: colors.foreground });
    expect(screen.getByText("quiet")).toHaveStyle({ color: colors["muted-foreground"] });
    expect(screen.getByText("wrong")).toHaveStyle({ color: colors.destructive });
  });

  it("sets no space around itself: its parent places it with gap", async () => {
    await renderWithLocale(<BodyText>near</BodyText>);

    expect(StyleSheet.flatten(screen.getByText("near").props.style).marginTop).toBeUndefined();
  });
});
