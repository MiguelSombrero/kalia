import type { Locale } from "@kalia/locales";
import type { QueryClient } from "@tanstack/react-query";
import { render } from "@testing-library/react-native";
import type { ReactElement } from "react";
import type { TokenStore } from "@/lib/auth/tokenStore";
import { AppProviders } from "@/lib/providers/AppProviders";
import { createQueryClient } from "@/lib/query/createQueryClient";

const clients: QueryClient[] = [];

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear());
});

export const renderWithLocale = (ui: ReactElement, locale: Locale = "en", tokenStore?: TokenStore) => {
  const queryClient = createQueryClient();
  clients.push(queryClient);
  return render(
    <AppProviders locale={locale} queryClient={queryClient} tokenStore={tokenStore}>
      {ui}
    </AppProviders>,
  );
};
