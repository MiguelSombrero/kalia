import { createElement } from "react";
import { View } from "react-native";

export const datePickerMock = {
  __esModule: true,
  default: (props: object) => createElement(View, props),
  DateTimePickerAndroid: { open: jest.fn() },
};
