import { render, screen } from "@testing-library/react-native";
import * as ReactNative from "react-native";
import { Pressable, Text, View } from "react-native";

import { PressFeedback } from "@/lib/motion";

import { accessibilityOffences, expectAccessibleStructure } from "./expectAccessibleStructure";

afterEach(() => jest.restoreAllMocks());

const noop = () => undefined;

describe("expectAccessibleStructure", () => {
  it("passes a pressable with a role, a name and a target of its own, however the name is given", async () => {
    await render(
      <>
        <Pressable role="button" accessibilityLabel="Close" onPress={noop} style={{ minHeight: 48, minWidth: 48 }} />
        <PressFeedback role="button" onPress={noop} style={{ height: 56 }}>
          <Text>Named by its text</Text>
        </PressFeedback>
        <Pressable role="link" onPress={noop} style={{ height: 40 }} hitSlop={8}>
          <Text>Slop makes up the difference</Text>
        </Pressable>
        <Pressable role="button" onPress={noop}>
          <Text>Sized by its content</Text>
        </Pressable>
      </>,
    );

    expect(accessibilityOffences()).toEqual([]);
    expectAccessibleStructure();
  });

  it("fails a pressable with no role", async () => {
    await render(<Pressable accessibilityLabel="Close" onPress={noop} />);

    expect(accessibilityOffences()).toEqual(['View "Close" has no role']);
    expect(expectAccessibleStructure).toThrow();
  });

  it("fails a pressable with no name, and one whose only text is hidden from assistive technology", async () => {
    await render(
      <>
        <Pressable role="button" onPress={noop} />
        <Pressable role="button" onPress={noop}>
          <Text importantForAccessibility="no-hide-descendants">✕</Text>
        </Pressable>
      </>,
    );

    expect(accessibilityOffences()).toEqual(['View "" has no name', 'View "" has no name']);
    expect(expectAccessibleStructure).toThrow();
  });

  it("fails a pressable declaring a target below the minimum, in either direction", async () => {
    await render(
      <>
        <Pressable role="button" accessibilityLabel="Short" onPress={noop} style={{ height: 32 }} />
        <Pressable role="button" accessibilityLabel="Narrow" onPress={noop} style={[{ minHeight: 48 }, { width: 24 }]} />
      </>,
    );

    expect(accessibilityOffences()).toEqual(['View "Short" declares a target 32 high, below 48', 'View "Narrow" declares a target 24 wide, below 48']);
    expect(expectAccessibleStructure).toThrow();
  });

  it.each(["radio", "checkbox"] as const)("fails a %s pressable on iOS, where React Native speaks its state in English, and not on Android", async (role) => {
    await render(<Pressable role={role} accessibilityLabel="Gose" onPress={noop} />);

    jest.replaceProperty(ReactNative.Platform, "OS", "ios");
    expect(accessibilityOffences()).toEqual([`View "Gose" carries the ${role} role on iOS, whose words React Native speaks in English`]);
    expect(expectAccessibleStructure).toThrow();

    jest.replaceProperty(ReactNative.Platform, "OS", "android");
    expect(accessibilityOffences()).toEqual([]);
  });

  it("holds a pressable text link to the same rules", async () => {
    await render(<Text onPress={noop}>Read more</Text>);

    expect(accessibilityOffences()).toEqual(['Text "Read more" has no role']);
  });

  it("leaves what is hidden from assistive technology, and what cannot be pressed, alone", async () => {
    await render(
      <>
        <View importantForAccessibility="no-hide-descendants">
          <Pressable onPress={noop} />
        </View>
        <View role="radiogroup" accessibilityLabel="Sort by">
          <Text>Sort by</Text>
        </View>
      </>,
    );

    expect(screen.toJSON()).not.toBeNull();
    expect(accessibilityOffences()).toEqual([]);
  });
});
