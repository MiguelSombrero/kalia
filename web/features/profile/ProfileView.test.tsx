import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import type { ReactNode } from "react";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";

vi.mock("./actions", () => ({ changeVisibilityAction: vi.fn() }));

import { ProfileView } from "./ProfileView";

const withProviders = (node: ReactNode) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({ lng: "en", ns: "common", resources: { en: { common: enCommon } } });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>{node}</I18nextProvider>
    </QueryClientProvider>
  );
};

describe("ProfileView", () => {
  it("titles the page with the username and says where that name appears", async () => {
    const { container } = render(
      withProviders(
        await ProfileView({
          locale: "en",
          profile: { username: "ada", cellarPublic: false },
          counts: { beers: 2, bottles: 3 },
        }),
      ),
    );

    expect(screen.getByRole("heading", { level: 1, name: "ada" })).toBeInTheDocument();
    expect(screen.getByText("Your name on Kalia")).toBeInTheDocument();
    expect(screen.getByText(/It is also your cellar's address, so it can't be changed\./)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Only me" })).toBeChecked();
    // Counted by cellarCounts, the one formula the front page uses too.
    expect(screen.getByRole("radio", { name: "Anyone with the link" })).toHaveAccessibleDescription(
      /^Your 2 beers and 3 bottles, with their dates/,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
