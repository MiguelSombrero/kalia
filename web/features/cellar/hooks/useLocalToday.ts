import { useSyncExternalStore } from "react";
import { todayIso } from "../bottleDateRules";

const subscribe = () => () => {};

/**
 * The caller's local calendar day, or null while rendering on the server and
 * hydrating: the server cannot know the visitor's day, and a value that
 * differed between the two renders would be a hydration mismatch (ADR-0070).
 */
export const useLocalToday = (): string | null => useSyncExternalStore(subscribe, todayIso, () => null);
