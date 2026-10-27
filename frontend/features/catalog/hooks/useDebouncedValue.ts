import { useEffect, useState } from "react";

const TYPING_PAUSE_MS = 300;

/** `value`, once it has stopped changing for a moment — so a request waits for the typing to pause. */
export const useDebouncedValue = <T>(value: T): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), TYPING_PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
};
