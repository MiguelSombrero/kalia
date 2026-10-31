import type { Locale } from "@kalia/locales";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "@/lib/i18n/createI18n";
import { createQueryClient } from "@/lib/query/createQueryClient";

export const AppProviders = ({ children, locale }: { children: ReactNode; locale: Locale }) => {
  const [queryClient] = useState(createQueryClient);
  const [i18n] = useState(() => createI18n(locale));

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [i18n, locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
};
