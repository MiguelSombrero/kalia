import { useSyncExternalStore } from "react";
import { AccessibilityInfo } from "react-native";

let reduced = false;
let watching: Promise<void> | undefined;
const listeners = new Set<() => void>();

const update = (next: boolean) => {
  if (next === reduced) return;
  reduced = next;
  listeners.forEach((notify) => notify());
};

// Started at app launch, not on first use, so a screen's first render already knows the setting rather than flashing its animation.
export const watchReducedMotion = (): Promise<void> => {
  watching ??= (async () => {
    AccessibilityInfo.addEventListener("reduceMotionChanged", update);
    update(await AccessibilityInfo.isReduceMotionEnabled().catch(() => false));
  })();
  return watching;
};

const subscribe = (notify: () => void) => {
  listeners.add(notify);
  return () => void listeners.delete(notify);
};

export const useReducedMotion = () => useSyncExternalStore(subscribe, () => reduced, () => false);
