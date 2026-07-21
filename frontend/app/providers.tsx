"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/**
 * Client-side providers, mounted once in the root layout. TanStack Query is
 * the mandatory data layer for client components (ADR-0008) — server
 * components keep fetching directly on the server and never touch this.
 */
export const Providers = ({ children }: { children: ReactNode }) => {
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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Stripped from production bundles automatically */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
};
