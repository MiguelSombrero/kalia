import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

export const useAnnounce = (message: string) => {
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
};
