import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { AccessibilityInfo, Animated, LayoutAnimation, Text } from "react-native";
import { PressFeedback } from "./PressFeedback";
import { Reveal } from "./Reveal";
import { SkeletonBlock } from "./SkeletonBlock";
import { useAnimateListChange } from "./useAnimateListChange";
import { watchReducedMotion } from "./reducedMotion";

const timing = jest.spyOn(Animated, "timing");
const loop = jest.spyOn(Animated, "loop");
const configureNext = jest.spyOn(LayoutAnimation, "configureNext");
const listeners: ((on: boolean) => void)[] = [];

beforeAll(async () => {
  jest.spyOn(AccessibilityInfo, "isReduceMotionEnabled").mockResolvedValue(true);
  jest.spyOn(AccessibilityInfo, "addEventListener").mockImplementation((_event, listener) => {
    listeners.push(listener as (on: boolean) => void);
    return { remove: jest.fn() };
  });
  await watchReducedMotion();
});
beforeEach(() => {
  timing.mockClear();
  loop.mockClear();
  configureNext.mockClear();
});

const ListChange = () => {
  const animateListChange = useAnimateListChange();
  return <Text onPress={animateListChange}>change</Text>;
};

describe("motion with the system's reduce-motion setting on", () => {
  it("shows revealed content at once, fully opaque, without starting a fade", async () => {
    await render(<Reveal><Text>Pale Ale</Text></Reveal>);

    expect(screen.getByText("Pale Ale")).toBeVisible();
    expect(timing).not.toHaveBeenCalled();
  });

  it("leaves a held control at full size and shows the hold by its opacity alone, at once", async () => {
    await render(<PressFeedback role="button" accessibilityLabel="Add"><Text>Add</Text></PressFeedback>);
    const button = screen.getByRole("button", { name: "Add" });

    await fireEvent(button, "pressIn");

    expect(timing).not.toHaveBeenCalled();
    expect(button).toHaveStyle({ opacity: 0.85, transform: [{ scale: 1 }] });
    await fireEvent(button, "pressOut");
    expect(button).not.toHaveStyle({ opacity: 0.85 });
  });

  it("holds a placeholder still at its final opacity, with no looping", async () => {
    await render(<SkeletonBlock />);

    expect(loop).not.toHaveBeenCalled();
    expect(timing).not.toHaveBeenCalled();
  });

  it("moves rows that stay to their new place at once", async () => {
    await render(<ListChange />);

    await fireEvent.press(screen.getByText("change"));

    expect(configureNext).not.toHaveBeenCalled();
  });

  it("starts animating again when the setting is switched off", async () => {
    await render(<Reveal><Text>Pale Ale</Text></Reveal>);
    timing.mockClear();

    await act(async () => listeners.forEach((listener) => listener(false)));
    await render(<Reveal><Text>Stout</Text></Reveal>);

    expect(timing).toHaveBeenCalled();
  });
});
