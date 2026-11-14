import { screen } from "@testing-library/react-native";
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

  it("sits flush unless it is asked to keep its distance", async () => {
    await renderWithLocale(
      <>
        <BodyText>near</BodyText>
        <BodyText spaced>apart</BodyText>
      </>,
    );

    expect(screen.getByText("near")).not.toHaveStyle({ marginTop: theme.spacing.medium });
    expect(screen.getByText("apart")).toHaveStyle({ marginTop: theme.spacing.medium });
  });
});
