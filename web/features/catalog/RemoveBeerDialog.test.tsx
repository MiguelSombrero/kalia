import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@kalia/locales/en/common.json";
import fiCommon from "@kalia/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ signIn: vi.fn() }));

import { RemoveBeerDialog } from "./RemoveBeerDialog";
import { useBeerRemovedStore } from "./store";

// The real chain runs — dialog, hook, Server Action, api.ts, kaliaFetch —
// against a stubbed backend, so these tests see the API's own responses.
const beerId = "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f";
const beerName = "Öö Bourbon";

type Answer = { status: number; body?: unknown } | "network";
let answer: Answer;
const requests: { method: string; path: string; body?: string }[] = [];

const backend = async (input: string, init: RequestInit = {}) => {
  const url = new URL(input);
  requests.push({ method: init.method ?? "GET", path: url.pathname, body: init.body ? String(init.body) : undefined });
  if (answer === "network") throw new TypeError("fetch failed");
  const contentType = answer.status === 200 ? "application/json" : "application/problem+json";
  return new Response(JSON.stringify(answer.body ?? {}), { status: answer.status, headers: { "Content-Type": contentType } });
};

const removed = { id: beerId, moderationStatus: "REMOVED" };

const LABELS = {
  en: { trigger: "Remove from catalog", confirm: "Remove beer", cancel: "Cancel" },
  fi: { trigger: "Poista luettelosta", confirm: "Poista olut", cancel: "Peruuta" },
} as const;

const renderDialog = (locale: Locale = "en") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <RemoveBeerDialog locale={locale} beerId={beerId} beerName={beerName} />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

const open = (locale: Locale = "en") => fireEvent.click(screen.getByRole("button", { name: LABELS[locale].trigger }));
const confirm = (locale: Locale = "en") =>
  fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: LABELS[locale].confirm }));

beforeEach(() => {
  requests.length = 0;
  answer = { status: 200, body: removed };
  push.mockReset();
  useBeerRemovedStore.setState({ beer: null });
  vi.stubGlobal("fetch", vi.fn(backend));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("RemoveBeerDialog", () => {
  it("offers the action and sends nothing until it is confirmed", async () => {
    const { container } = renderDialog();

    expect(screen.getByRole("button", { name: "Remove from catalog" })).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(requests).toEqual([]);
    expect(await axe(container)).toHaveNoViolations();
  });

  it.each(["en", "fi"] as const)("names the beer and says what happens to it and to those who hold it, in %s", async (locale) => {
    renderDialog(locale);

    open(locale);

    const dialog = await screen.findByRole("alertdialog");
    expect(dialog).toHaveAccessibleName(locale === "en" ? "Remove this beer?" : "Poistetaanko tämä olut?");
    expect(dialog).toHaveAccessibleDescription(
      locale === "en"
        ? "Öö Bourbon will disappear from the catalog for everyone. Anyone who holds it keeps their bottles and sees the beer unlinked."
        : "Öö Bourbon poistuu kaikkien näkyviltä. Ne, joilla olut on kellarissaan, pitävät pullonsa, mutta heille olut näkyy ilman linkkiä.",
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("changes nothing when it is cancelled", async () => {
    renderDialog();
    open();

    fireEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(requests).toEqual([]);
    expect(push).not.toHaveBeenCalled();
    expect(useBeerRemovedStore.getState().beer).toBeNull();
    expect(screen.getByRole("button", { name: "Remove from catalog" })).toHaveFocus();
  });

  it.each(["en", "fi"] as const)(
    "removes the beer through the admin API, announces it and lands on the catalog's search, in %s",
    async (locale) => {
      renderDialog(locale);
      open(locale);
      await screen.findByRole("alertdialog");

      confirm(locale);

      await waitFor(() => expect(push).toHaveBeenCalledWith(`/${locale}/beers`));
      expect(requests).toEqual([{ method: "POST", path: `/api/v1/admin/beers/${beerId}/removal`, body: undefined }]);
      expect(useBeerRemovedStore.getState().beer).toEqual({ name: beerName });
    },
  );

  it("is busy while the request is in flight, and cannot be confirmed twice", async () => {
    let release: () => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string, init: RequestInit) => {
        await new Promise<void>((resolve) => (release = resolve));
        return backend(input, init);
      }),
    );
    renderDialog();
    open();
    await screen.findByRole("alertdialog");

    confirm();

    const busy = await screen.findByRole("button", { name: "Removing…" });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    release();
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
    expect(requests).toHaveLength(1);
  });

  describe("when the removal is refused or fails", () => {
    const failures: { name: string; answer: Answer; en: string; fi: string }[] = [
      {
        name: "403",
        answer: { status: 403, body: { title: "Forbidden", status: 403 } },
        en: "You are not allowed to remove beers.",
        fi: "Sinulla ei ole oikeutta poistaa oluita.",
      },
      {
        name: "404",
        answer: { status: 404, body: { title: "Not Found", status: 404 } },
        en: "This beer is no longer in the catalog.",
        fi: "Tämä olut ei ole enää luettelossa.",
      },
      {
        name: "409",
        answer: { status: 409, body: { title: "Conflict", status: 409, currentStatus: "REMOVED" } },
        en: "This beer is no longer approved, so it can't be removed. Another admin may have removed it already.",
        fi: "Tämä olut ei ole enää hyväksytty, joten sitä ei voi poistaa. Toinen ylläpitäjä on voinut poistaa sen jo.",
      },
      {
        name: "500",
        answer: { status: 500, body: { title: "Internal Server Error", status: 500 } },
        en: "The beer was not removed. Please try again.",
        fi: "Olutta ei poistettu. Yritä uudelleen.",
      },
      {
        name: "a network failure",
        answer: "network",
        en: "The beer was not removed. Please try again.",
        fi: "Olutta ei poistettu. Yritä uudelleen.",
      },
    ];

    it.each(failures)("shows the admin the $name and leaves them on the page", async (failure) => {
      answer = failure.answer;
      renderDialog();
      open();
      await screen.findByRole("alertdialog");

      confirm();

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(failure.en);
      expect(push).not.toHaveBeenCalled();
      expect(useBeerRemovedStore.getState().beer).toBeNull();
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
      expect(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove beer" })).toBeEnabled();
    });

    it.each(failures)("says the $name in Finnish, and passes axe", async (failure) => {
      answer = failure.answer;
      renderDialog("fi");
      open("fi");
      await screen.findByRole("alertdialog");

      confirm("fi");

      expect(await screen.findByRole("alert")).toHaveTextContent(failure.fi);
      expect(await axe(document.body)).toHaveNoViolations();
    });

    it("clears the failure when the dialog is closed and opened again", async () => {
      answer = { status: 409, body: { title: "Conflict", status: 409 } };
      renderDialog();
      open();
      await screen.findByRole("alertdialog");
      confirm();
      await screen.findByRole("alert");

      fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Cancel" }));
      await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
      open();

      await screen.findByRole("alertdialog");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });
  });
});
