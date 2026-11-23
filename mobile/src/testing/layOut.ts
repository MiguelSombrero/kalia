import { fireEvent } from "@testing-library/react-native";

type Element = Parameters<typeof fireEvent>[0];

export const layOut = (element: Element) => fireEvent(element, "layout", { nativeEvent: { layout: { x: 0, y: 0, width: 320, height: 24 } } });
