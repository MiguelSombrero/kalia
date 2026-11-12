import { screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";

export const expectScalesWithText = () => {
  const offences: string[] = [];
  const visit = (node: { type: unknown; props: Record<string, unknown>; children: unknown[] }) => {
    const style = StyleSheet.flatten(node.props.style as never) ?? {};
    if (node.props.numberOfLines !== undefined) offences.push(`${String(node.type)} sets numberOfLines`);
    if (node.props.allowFontScaling === false) offences.push(`${String(node.type)} sets allowFontScaling={false}`);
    if (typeof (style as { height?: unknown }).height === "number") offences.push(`${String(node.type)} has a fixed height`);
    for (const child of node.children) if (typeof child === "object" && child !== null) visit(child as never);
  };
  visit(screen.toJSON() as never);
  expect(offences).toEqual([]);
};
