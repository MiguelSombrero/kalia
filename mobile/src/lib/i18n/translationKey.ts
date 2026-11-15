import type { resources } from "@kalia/locales";
import type { ParseKeys } from "i18next";

declare module "i18next" {
  // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- augmentation merges only an interface
  interface CustomTypeOptions {
    defaultNS: "common";
    resources: (typeof resources)["en"];
  }
}

export type TranslationKey = ParseKeys;
