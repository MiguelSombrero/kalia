import { useEffect, useState } from "react";

export const PAUSE_MS = 300;

export const useDebounced = <T,>(value: T): T => {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), PAUSE_MS);
    return () => clearTimeout(timer);
  }, [value]);
  return settled;
};
