import { useEffect } from "react";
import { useFiltersStore } from "../filters/store";

export const PAUSE_MS = 300;
export const MIN_QUERY_LENGTH = 2;

export const settledQuery = (text: string) => (text.trim().length >= MIN_QUERY_LENGTH ? text.trim() : "");

/** The query follows the text after a pause, because the edge limits requests per address (ADR-0090). */
export const useSearchDraft = () => {
  const text = useFiltersStore((state) => state.text);
  const setText = useFiltersStore((state) => state.setText);
  const setQuery = useFiltersStore((state) => state.setQuery);

  const send = (value: string) => {
    const next = settledQuery(value);
    if (next !== useFiltersStore.getState().applied.query) setQuery(next);
  };

  useEffect(() => {
    const timer = setTimeout(() => send(text), PAUSE_MS);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- send reads the store and a stable setter only
  }, [text]);

  return { text, setText, submit: () => send(text) };
};
