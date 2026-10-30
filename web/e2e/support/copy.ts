import en from "@kalia/locales/en/common.json";
import fi from "@kalia/locales/fi/common.json";

export type Locale = "en" | "fi";

export const LOCALES: readonly Locale[] = ["en", "fi"];

type Messages = { [key: string]: string | Messages };

const MESSAGES: Record<Locale, Messages> = { en, fi };

/**
 * The app's own wording for `key` in `locale`, so a spec can walk either
 * language without a second copy of its strings. Takes i18next's
 * `{{name}}` interpolation and its `_one`/`_other` plural suffixes.
 */
export const copyFor =
  (locale: Locale) =>
  (key: string, values: Record<string, string | number> = {}): string => {
    const lookup = (path: string) =>
      path.split(".").reduce<string | Messages | undefined>(
        (node, part) => (typeof node === "object" ? node[part] : undefined),
        MESSAGES[locale],
      );
    const plural = typeof values.count === "number" ? `${key}_${values.count === 1 ? "one" : "other"}` : key;
    const message = lookup(plural) ?? lookup(key);
    if (typeof message !== "string") throw new Error(`no ${locale} message at ${key}`);
    return message.replace(/\{\{(\w+)\}\}/g, (_, name: string) => {
      if (!(name in values)) throw new Error(`${locale} message ${key} needs a value for {{${name}}}`);
      return String(values[name]);
    });
  };
