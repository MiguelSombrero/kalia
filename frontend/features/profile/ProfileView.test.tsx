import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";

vi.mock("./actions", () => ({ changeVisibilityAction: vi.fn() }));

import { ProfileView } from "./ProfileView";

describe("ProfileView", () => {
  it("shows the signed-in user's username and current visibility, with no cellar summary", async () => {
    const i18n = createInstance();
    i18n.use(initReactI18next).init({ lng: "en", ns: "common", resources: { en: { common: enCommon } } });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <I18nextProvider i18n={i18n}>
          <ProfileView profile={{ username: "ada", cellarPublic: false }} />
        </I18nextProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText("ada")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Only me" })).toBeChecked();
    // No bottle/entry count anywhere: a second place cellar totals render
    // drifts from the cellar page the first time either changes.
    expect(screen.queryByText(/bottle/i)).not.toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});
