import type { Locale } from "@kalia/locales";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { getTokenStore } from "@/lib/auth/defaultTokenStore";
import type { TokenStore } from "@/lib/auth/tokenStore";
import { createI18n } from "@/lib/i18n/createI18n";
import { createQueryClient } from "@/lib/query/createQueryClient";
import { useAppStateFocus } from "@/lib/query/useAppStateFocus";

export const AppProviders = ({
  children,
  locale,
  queryClient: provided,
  tokenStore = getTokenStore(),
}: {
  children: ReactNode;
  locale: Locale;
  queryClient?: QueryClient;
  tokenStore?: TokenStore;
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
      <AuthProvider tokenStore={tokenStore}>
        <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
