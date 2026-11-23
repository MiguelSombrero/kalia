import { act, fireEvent, screen } from "@testing-library/react-native";
import { useState } from "react";
import { AccessibilityInfo, Text } from "react-native";

import { theme } from "@/lib/design/theme.generated";
import { MODES, systemIs, withLargestFont } from "@/testing/colorMode";
import { layOut } from "@/testing/layOut";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { Sheet, SHEET_PRESENTED_MS } from "./Sheet";

afterEach(() => jest.restoreAllMocks());

describe("Sheet", () => {
  it.each(MODES)("rests on the raised surface and writes its title in the foreground in %s", async (mode) => {
    systemIs(mode);
    await renderWithLocale(
      <Sheet title="Lisää olut" closeLabel="Sulje" onClose={() => undefined}>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    expect(screen.getByTestId("sheet")).toHaveStyle({ backgroundColor: theme.colors[mode].surface });
    expect(screen.getByRole("heading", { name: "Lisää olut" })).toHaveStyle({ color: theme.colors[mode].foreground });
  });

  it("closes", async () => {
    const onClose = jest.fn();
    await renderWithLocale(
      <Sheet title="Kirjaudu sisään" closeLabel="Sulje" onClose={onClose}>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Sulje" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can hold its close while something is under way", async () => {
    const onClose = jest.fn();
    await renderWithLocale(
      <Sheet title="Kirjaudu sisään" closeLabel="Sulje" onClose={onClose} closeDisabled>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    await fireEvent.press(screen.getByRole("button", { name: "Sulje" }));

    expect(screen.getByRole("button", { name: "Sulje" })).toBeDisabled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("places a trailing action, a bar and a footer around its body", async () => {
    await renderWithLocale(
      <Sheet title="Suodattimet" closeLabel="Sulje" onClose={() => undefined} trailing={<Text>trailing</Text>} bar={<Text>bar</Text>} footer={<Text>footer</Text>}>
        <Text>body</Text>
      </Sheet>,
      "fi",
    );

    for (const part of ["trailing", "bar", "footer", "body"]) expect(screen.getByText(part)).toBeOnTheScreen();
  });

  it("keeps its close, title and body at the largest text size with a long Finnish title", async () => {
    await withLargestFont(async () => {
      await renderWithLocale(
        <Sheet title="Panimoiden yhteisomistuksessa toimiva erikoisolutpanimo" closeLabel="‹ Suodattimet" closeAccessibilityLabel="Takaisin suodattimiin" onClose={() => undefined}>
          <Text>body</Text>
        </Sheet>,
        "fi",
      );

      expect(screen.getByRole("button", { name: "Takaisin suodattimiin" })).toBeOnTheScreen();
      expect(screen.getByRole("heading", { name: "Panimoiden yhteisomistuksessa toimiva erikoisolutpanimo" })).toBeOnTheScreen();
    });
  });

  describe("focus", () => {
    const focus = () => jest.mocked(AccessibilityInfo.sendAccessibilityEvent);
    const sentTo = (call: number) => focus().mock.calls[call] as unknown as [{ props: Record<string, unknown> }, string];
    const settle = (ms = SHEET_PRESENTED_MS) => act(() => void jest.advanceTimersByTime(ms));

    const OnePage = () => (
      <Sheet title="Lisää olut" closeLabel="Sulje" onClose={() => undefined}>
        <Text>body</Text>
      </Sheet>
    );
    const TwoPages = () => {
      const [title, setTitle] = useState("Suodattimet");
      return (
        <Sheet title={title} closeLabel="Sulje" onClose={() => undefined}>
          <Text onPress={() => setTitle("Tyyli")}>next</Text>
        </Sheet>
      );
    };

    beforeEach(() => {
      jest.useFakeTimers();
      focus().mockClear();
    });
    afterEach(() => jest.useRealTimers());

    it("sends a focus request to its heading once the heading is on screen and the sheet has finished presenting, with no focus code in the sheet's user", async () => {
      await renderWithLocale(<OnePage />, "fi");
      expect(focus()).not.toHaveBeenCalled();

      await layOut(screen.getByRole("heading", { name: "Lisää olut" }));
      await settle(SHEET_PRESENTED_MS - 1);
      expect(focus()).not.toHaveBeenCalled();
      await settle(1);

      expect(focus()).toHaveBeenCalledTimes(1);
      expect(sentTo(0)[1]).toBe("focus");
      expect(sentTo(0)[0].props).toMatchObject({ role: "heading", children: "Lisää olut" });
    });

    it("asks once for a page, however often its heading is laid out again", async () => {
      await renderWithLocale(<OnePage />, "fi");
      const heading = screen.getByRole("heading", { name: "Lisää olut" });

      await layOut(heading);
      await layOut(heading);
      await settle();

      expect(focus()).toHaveBeenCalledTimes(1);
    });

    it("sends nothing when the sheet closes before it has finished presenting", async () => {
      const { unmount } = await renderWithLocale(<OnePage />, "fi");
      await layOut(screen.getByRole("heading", { name: "Lisää olut" }));

      await unmount();
      await settle();

      expect(focus()).not.toHaveBeenCalled();
    });

    it("asks again at once for the heading of the next page once that heading is on screen, not before", async () => {
      await renderWithLocale(<TwoPages />, "fi");
      await layOut(screen.getByRole("heading", { name: "Suodattimet" }));
      await settle();
      expect(focus()).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByText("next"));
      expect(focus()).toHaveBeenCalledTimes(1);
      await layOut(screen.getByRole("heading", { name: "Tyyli" }));

      expect(focus()).toHaveBeenCalledTimes(2);
      expect(sentTo(1)[0].props).toMatchObject({ role: "heading", children: "Tyyli" });
    });
  });
});
