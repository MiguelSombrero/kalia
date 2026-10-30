import { redirect } from "next/navigation";
import type { Locale } from "@/i18n/settings";
import { isApiError } from "@kalia/api";
import { getProfile } from "./api";
import type { Profile } from "./types";

// ADR-0080: on the profile routes, 409 means another account holds the caller's username.
export const isUsernameTaken = (error: unknown): boolean => isApiError(error) && error.status === 409;

export const usernameTakenPath = (locale: Locale) => `/${locale}/username-taken`;

const redirectIfUsernameTaken = (locale: Locale, error: unknown) => {
  if (isUsernameTaken(error)) {
    redirect(usernameTakenPath(locale));
  }
};

export const getOwnProfile = (locale: Locale): Promise<Profile> =>
  getProfile().catch((error: unknown) => {
    redirectIfUsernameTaken(locale, error);
    throw error;
  });

export const getOwnProfileOrNull = (locale: Locale): Promise<Profile | null> =>
  getProfile().catch((error: unknown) => {
    redirectIfUsernameTaken(locale, error);
    return null;
  });
