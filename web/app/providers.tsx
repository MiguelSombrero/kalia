"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createInstance } from "i18next";
import { useState, type ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

// Mounted once in the root layout (ADR-0008). Resources are imported
// statically so init() completes synchronously — otherwise untranslated
// keys flash while the JSON streams in.
export const Providers = ({ children, locale }: { children: ReactNode; locale: Locale }) => {
  // useState avoids sharing one QueryClient across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
          },
        },
      }),
  );

  const [i18nInstance] = useState(() => {
    const instance = createInstance();
    instance.use(initReactI18next).init({
      ...getOptions(locale),
      resources: { en: { common: enCommon }, fi: { common: fiCommon } },
    });
    return instance;
  });

  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18nInstance}>
        {children}
        {/* Stripped from production bundles automatically */}
        <ReactQueryDevtools initialIsOpen={false} />
      </I18nextProvider>
    </QueryClientProvider>
  );
};
