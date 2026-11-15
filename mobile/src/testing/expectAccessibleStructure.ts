import { screen } from "@testing-library/react-native";
import { Platform, StyleSheet } from "react-native";

import { theme } from "@/lib/design/theme.generated";

type Node = { type: string; props: Record<string, unknown>; children: (Node | string)[] | null };

const MINIMUM_TARGET = theme.spacing.touch;
const IOS_UNSPOKEN_ROLES = ["radio", "checkbox"];

const hiddenFromAssistiveTechnology = (props: Record<string, unknown>) =>
  props.accessibilityElementsHidden === true || props["aria-hidden"] === true || props.importantForAccessibility === "no-hide-descendants";

const isPressable = (node: Node) => typeof node.props.onClick === "function" || (node.type === "Text" && typeof node.props.onPress === "function");

const textOf = (node: Node | string): string => {
  if (typeof node === "string") return node;
  if (hiddenFromAssistiveTechnology(node.props)) return "";
  return (node.children ?? []).map(textOf).join("");
};

const declaredNumber = (...values: unknown[]) => values.filter((value): value is number => typeof value === "number");
const slop = (hitSlop: unknown, sides: [string, string]) => {
  if (typeof hitSlop === "number") return 2 * hitSlop;
  const edges = (hitSlop ?? {}) as Record<string, number | undefined>;
  return (edges[sides[0]] ?? 0) + (edges[sides[1]] ?? 0);
};

// Jest has no layout: a size left to a pressable's content is not declared, so it is not judged.
const declaredTarget = (props: Record<string, unknown>) => {
  const style = (StyleSheet.flatten(props.style as never) ?? {}) as Record<string, unknown>;
  const height = declaredNumber(style.height, style.minHeight);
  const width = declaredNumber(style.width, style.minWidth);
  return {
    height: height.length ? Math.max(...height) + slop(props.hitSlop, ["top", "bottom"]) : undefined,
    width: width.length ? Math.max(...width) + slop(props.hitSlop, ["left", "right"]) : undefined,
  };
};

const describe = (node: Node) => `${node.type} "${String(node.props.accessibilityLabel ?? textOf(node)).slice(0, 40)}"`;

export const inspectStructure = (root: Node | Node[] | null = screen.toJSON() as Node | Node[] | null) => {
  const offences: string[] = [];
  let pressables = 0;
  const ios = Platform.OS === "ios";
  const visit = (node: Node | string) => {
    if (typeof node === "string" || hiddenFromAssistiveTechnology(node.props)) return;
    if (isPressable(node)) {
      pressables += 1;
      const role = String(node.props.role ?? node.props.accessibilityRole ?? "");
      const name = String(node.props.accessibilityLabel ?? "").trim() || textOf(node).trim();
      if (!role || role === "none") offences.push(`${describe(node)} has no role`);
      if (!name) offences.push(`${describe(node)} has no name`);
      if (ios && IOS_UNSPOKEN_ROLES.includes(role)) offences.push(`${describe(node)} carries the ${role} role on iOS, whose words React Native speaks in English`);
      const { height, width } = declaredTarget(node.props);
      if (height !== undefined && height < MINIMUM_TARGET) offences.push(`${describe(node)} declares a target ${height} high, below ${MINIMUM_TARGET}`);
      if (width !== undefined && width < MINIMUM_TARGET) offences.push(`${describe(node)} declares a target ${width} wide, below ${MINIMUM_TARGET}`);
    }
    (node.children ?? []).forEach(visit);
  };
  (Array.isArray(root) ? root : [root]).forEach((node) => node && visit(node));
  return { offences, pressables };
};

export const accessibilityOffences = () => inspectStructure().offences;

export const expectAccessibleStructure = () => expect(accessibilityOffences()).toEqual([]);
