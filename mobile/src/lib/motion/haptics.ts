import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

type Outcome = "success" | "warning" | "error";

const types = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
} as const;

/** Taps the phone for the result of something the person asked for; does nothing where there is no motor, and never throws. */
export const haptic = (outcome: Outcome): void => {
  if (Platform.OS === "web") return;
  try {
    void Promise.resolve(Haptics.notificationAsync(types[outcome])).catch(() => undefined);
  } catch {
    return;
  }
};
