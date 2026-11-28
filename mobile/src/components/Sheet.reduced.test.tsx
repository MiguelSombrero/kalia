import { fireEvent, screen } from "@testing-library/react-native";
import { useRef } from "react";
import { AccessibilityInfo, type HostInstance, ScrollView, Text, View } from "react-native";

import { watchReducedMotion } from "@/lib/motion/reducedMotion";
import { renderWithLocale } from "@/testing/renderWithLocale";

import { Sheet, useRevealInSheet } from "./Sheet";

beforeAll(async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation(() => ({ remove: jest.fn() }) as never);
  await watchReducedMotion();
});

const Revealed = () => {
  const node = useRef<HostInstance>(null);
  const reveal = useRevealInSheet();
  return (
    <View ref={node}>
      <Text onPress={() => reveal(node.current)}>reveal</Text>
    </View>
  );
};

describe("Sheet with the system's reduce-motion setting on", () => {
  it("jumps to the part it brings into view, with no animation", async () => {
    jest.spyOn(View.prototype as unknown as HostInstance, "measureLayout").mockImplementation((_relativeTo, onSuccess) => onSuccess(0, 700, 320, 400));
    const scrollTo = jest.spyOn(ScrollView.prototype as unknown as { scrollTo: () => void }, "scrollTo");
    await renderWithLocale(
      <Sheet title="Lisää pulloja" closeLabel="Peruuta" onClose={() => undefined}>
        <Revealed />
      </Sheet>,
      "fi",
    );

    await fireEvent.press(screen.getByText("reveal"));

    expect(scrollTo).toHaveBeenCalledWith(expect.objectContaining({ animated: false }));
  });
});
