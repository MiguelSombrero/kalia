import { fireEvent, render, screen } from "@testing-library/react-native";
import { Animated, LayoutAnimation, Text } from "react-native";
import { theme } from "@/lib/design/theme.generated";
import { PRESS_SCALE, PressFeedback } from "./PressFeedback";
import { Reveal } from "./Reveal";
import { SkeletonBlock } from "./SkeletonBlock";
import { useAnimateListChange } from "./useAnimateListChange";
import { watchReducedMotion } from "./reducedMotion";

const timing = jest.spyOn(Animated, "timing");
const configureNext = jest.spyOn(LayoutAnimation, "configureNext");

beforeAll(() => watchReducedMotion());
beforeEach(() => {
  timing.mockClear();
  configureNext.mockClear();
});

const ListChange = () => {
  const animateListChange = useAnimateListChange();
  return <Text onPress={animateListChange}>change</Text>;
};

describe("motion with the system's default settings", () => {
  it("fades content in over the reveal duration", async () => {
    await render(<Reveal><Text>Pale Ale</Text></Reveal>);

    expect(screen.getByText("Pale Ale")).not.toBeVisible();
    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: theme.duration.reveal }));
  });

  it("shrinks a held control a little over the press duration and releases it", async () => {
    await render(<PressFeedback role="button" accessibilityLabel="Add"><Text>Add</Text></PressFeedback>);
    const button = screen.getByRole("button", { name: "Add" });

    await fireEvent(button, "pressIn");
    expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: PRESS_SCALE, duration: theme.duration.press }));
    await fireEvent(button, "pressOut");

    expect(timing).toHaveBeenLastCalledWith(expect.anything(), expect.objectContaining({ toValue: 1, duration: theme.duration.press }));
  });

  it("breathes a placeholder at the pulse duration", async () => {
    await render(<SkeletonBlock />);

    expect(timing).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ duration: theme.duration.pulse }));
  });

  it("slides rows that stay to their new place over the layout duration", async () => {
    await render(<ListChange />);

    await fireEvent.press(screen.getByText("change"));

    expect(configureNext).toHaveBeenCalledWith(expect.objectContaining({ duration: theme.duration.layout }));
  });
});
