import { StyleSheet } from "react-native";

import { textStyle } from "@/lib/design/fonts";

const styles = StyleSheet.create({ title: textStyle("screen-title", "bold") });

const label = textStyle("body", "normal");

export const shared = { ...textStyle("caption", "bold") };

export const titleStyle = [styles.title, label];
