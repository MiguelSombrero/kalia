/**
 * The key of the generic label a value shows as when this build does not know
 * it: "Other" in `en`, "Muu" in `fi` (ADR-0093).
 */
export const UNKNOWN_VALUE_LABEL_KEY = "unknownValue";

/**
 * Makes a lookup for a value of an API enum that answers with `fallback` for
 * anything `entries` does not list. The backend only grows an enum, so an
 * installed app meets values its build never saw; a closed `Record` lookup
 * returns `undefined` for those. `E` names the enum so `entries` must list
 * every value the build knows (ADR-0093).
 */
export const enumLookup = <E extends string, V>(
  entries: Readonly<Record<E, V>>,
  fallback: V,
): ((value: string | undefined) => V) => {
  return (value) => (value !== undefined && Object.hasOwn(entries, value) ? entries[value as E] : fallback);
};
