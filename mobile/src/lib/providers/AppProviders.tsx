import type { Locale } from "@kalia/locales";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "@/lib/i18n/createI18n";
import { createQueryClient } from "@/lib/query/createQueryClient";
import { useAppStateFocus } from "@/lib/query/useAppStateFocus";

export const AppProviders = ({
  children,
  locale,
  queryClient: provided,
}: {
  children: ReactNode;
  locale: Locale;
  queryClient?: QueryClient;
}) => {
  const [created] = useState(createQueryClient);
  const queryClient = provided ?? created;
  const [i18n] = useState(() => createI18n(locale));

  useAppStateFocus();

  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [i18n, locale]);

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </QueryClientProvider>
  );
};
