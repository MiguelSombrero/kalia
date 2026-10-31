import type { Locale } from "@kalia/locales";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import { AppProviders } from "@/lib/providers/AppProviders";

export const renderWithLocale = (ui: ReactElement, locale: Locale = "en") =>
  render(<AppProviders locale={locale}>{ui}</AppProviders>);
