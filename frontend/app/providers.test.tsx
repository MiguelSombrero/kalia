import { useQueryClient } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTranslation } from "react-i18next";
import { Providers } from "./providers";

/** Throws during render unless a QueryClientProvider is above it. */
const QueryClientProbe = () => {
  useQueryClient();
  return <p>query client available</p>;
};

/** Throws during render unless an I18nextProvider is above it. */
const TranslationProbe = () => {
  const { t } = useTranslation();
  return <p>{t("app.browseCatalog")}</p>;
};

describe("Providers", () => {
  it("provides a TanStack QueryClient to client components", () => {
    render(
      <Providers locale="en">
        <QueryClientProbe />
      </Providers>,
    );

    expect(screen.getByText("query client available")).toBeInTheDocument();
  });

  it("provides an i18next instance seeded with the given locale", () => {
    render(
      <Providers locale="fi">
        <TranslationProbe />
      </Providers>,
    );

    expect(screen.getByText("Selaa oluita")).toBeInTheDocument();
  });
});
