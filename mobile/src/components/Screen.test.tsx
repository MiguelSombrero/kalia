import { screen } from "@testing-library/react-native";
import { Text } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs } from "@/testing/colorMode";
import { renderWithLocale } from "@/testing/renderWithLocale";
import { Screen } from "./Screen";

afterEach(() => jest.restoreAllMocks());

describe("Screen", () => {
  it.each(MODES)("fills the screen with the background colour in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(
      <Screen>
        <Text>inside</Text>
      </Screen>,
    );

    expect(screen.getByText("inside")).toBeOnTheScreen();
    expect(screen.getByTestId("screen")).toHaveStyle({ backgroundColor: theme.colors[mode].background });
  });

  it("scrolls as a page", async () => {
    await renderWithLocale(
      <Screen>
        <Text>page</Text>
      </Screen>,
    );

    expect(screen.getByTestId("screen-scroll")).toBeOnTheScreen();
  });

  it("leaves scrolling to the list inside it when asked to", async () => {
    await renderWithLocale(
      <Screen scroll={false}>
        <Text>list</Text>
      </Screen>,
    );

    expect(screen.getByText("list")).toBeOnTheScreen();
    expect(screen.queryByTestId("screen-scroll")).not.toBeOnTheScreen();
  });
});
