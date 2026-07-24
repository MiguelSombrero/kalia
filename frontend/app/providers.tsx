"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createInstance } from "i18next";
import { useState, type ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

/**
 * Client-side providers, mounted once in the root layout. TanStack Query is
 * the mandatory data layer for client components (ADR-0008) — server
 * components keep fetching directly on the server and never touch this.
 *
 * The i18next instance here is the client counterpart to i18n/server.ts —
 * needed by any Client Component that translates (first consumer:
 * app/[locale]/error.tsx, since error boundaries get no route params).
 * Resources are imported statically (not the server's dynamic-import
 * backend) so init() completes synchronously — no flash of untranslated
 * keys while a small JSON file streams in.
 */
export const Providers = ({ children, locale }: { children: ReactNode; locale: Locale }) => {
  // useState keeps one QueryClient per browser session without sharing it
  // across requests during SSR.
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Server data rarely changes mid-interaction here; avoid refetch
            // storms on focus/mount. Override per-query where freshness matters.
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
