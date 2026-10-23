import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@/i18n/locales/en/common.json";
import fiCommon from "@/i18n/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/auth", () => ({ signIn: vi.fn() }));

import { AddBeerDialog } from "./AddBeerDialog";
import { useJustAddedStore } from "./store";

// The real chain runs — dialog, hooks, Server Actions, api.ts, kaliaFetch —
// against a stubbed backend, so these tests see the API's own responses.
const pohjala = { id: "7f1c2a3b-0000-4000-8000-000000000001", name: "Põhjala", countryCode: "EE", city: "Tallinn" };
const oo = { id: "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e0f", name: "Öö", style: "Imperial Stout", abv: 10.5, brewery: pohjala };
const virmalised = { ...oo, id: "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e10", name: "Virmalised", style: "IPA", abv: 6.5 };
const created = { ...oo, id: "5f9a0a3e-1f2b-4c3d-8e4f-5a6b7c8d9e11", name: "Öö Bourbon", abv: 12.5 };
const page = <T,>(content: T[]) => ({ content, totalElements: content.length, totalPages: 1, page: 0 });

type Posted = { status: number; body: unknown };
let posted: Posted;
const requests: { method: string; url: URL; body?: unknown }[] = [];

const backend = async (input: string, init: RequestInit = {}) => {
  const url = new URL(input);
  const method = init.method ?? "GET";
  requests.push({ method, url, body: init.body ? JSON.parse(String(init.body)) : undefined });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
  if (method === "POST" && url.pathname === "/api/v1/beers") return json(posted.body, posted.status);
  if (url.pathname === "/api/v1/styles") return json(["IPA", "Imperial Stout", "Porter"]);
  if (url.pathname === "/api/v1/countries") return json(["SE", "FI", "EE"]);
  if (url.pathname === "/api/v1/breweries") return json(page(url.searchParams.get("query")?.startsWith("Põh") ? [pohjala] : []));
  if (url.pathname === "/api/v1/beers" && url.searchParams.has("breweryId")) return json(page([oo, virmalised]));
  if (url.pathname === `/api/v1/beers/${oo.id}`) return json(oo);
  return new Response(null, { status: 404 });
};

const renderDialog = (locale: Locale = "en", initialName = "Öö Bourbon") => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({
    ...getOptions(locale),
    resources: { en: { common: enCommon }, fi: { common: fiCommon } },
  });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <AddBeerDialog locale={locale} initialName={initialName} trigger="button" />
      </I18nextProvider>
    </QueryClientProvider>,
  );
};

const openForm = async (locale: Locale = "en", initialName?: string) => {
  const rendered = renderDialog(locale, initialName);
  fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Add a beer" : "Lisää olut" }));
  await screen.findByRole("combobox", { name: locale === "en" ? "Brewery" : "Panimo" });
  return rendered;
};

const brewery = () => screen.getByRole("combobox", { name: "Brewery" });

const pickPohjala = async () => {
  fireEvent.focus(brewery());
  fireEvent.change(brewery(), { target: { value: "Põh" } });
  fireEvent.mouseDown(await screen.findByRole("option", { name: /^Põhjala/ }));
};

const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });

const fillValidBeer = async () => {
  await pickPohjala();
  fill("Style", "Imperial Stout");
  fill("Strength (ABV %)", "12.5");
};

const submit = () => fireEvent.click(screen.getByRole("button", { name: "Add beer" }));

beforeEach(() => {
  requests.length = 0;
  posted = { status: 201, body: created };
  push.mockReset();
  useJustAddedStore.setState({ beer: null, toastOpen: false });
  vi.stubGlobal("fetch", vi.fn(backend));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AddBeerDialog", () => {
  it("draws the form's shape while its styles and countries load", async () => {
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Add a beer" }));

    expect(screen.getByTestId("add-beer-skeleton")).toBeInTheDocument();
    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
  });

  it("carries the search term in as the beer's name", async () => {
    await openForm();

    expect(screen.getByLabelText("Name")).toHaveValue("Öö Bourbon");
  });

  it("shows the brewery's similarly named beers before anything is submitted", async () => {
    await openForm();

    await pickPohjala();

    const similar = await screen.findByRole("region", { name: "Põhjala already has" });
    expect(await within(similar).findByText("Öö")).toBeInTheDocument();
    expect(within(similar).queryByText("Virmalised")).not.toBeInTheDocument();
    expect(within(similar).getByRole("link", { name: "Open Öö" })).toHaveAttribute("href", `/en/beers/${oo.id}`);
    expect(screen.getByText("Tallinn, Estonia", { selector: "p" })).toBeInTheDocument();
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  it("adds the beer, then lands on a search that finds it and announces it", async () => {
    await openForm();
    await fillValidBeer();

    submit();

    await waitFor(() => expect(push).toHaveBeenCalledWith("/en/beers?query=%C3%96%C3%B6+Bourbon"));
    expect(requests.find((request) => request.method === "POST")?.body).toEqual({
      name: "Öö Bourbon",
      style: "Imperial Stout",
      abv: 12.5,
      breweryId: pohjala.id,
    });
    expect(useJustAddedStore.getState()).toMatchObject({ beer: { id: created.id, name: "Öö Bourbon" }, toastOpen: true });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("adds a brewery the catalog lacks in the same form", async () => {
    await openForm("en", "Ruosniemen Porter");
    fireEvent.focus(brewery());
    fireEvent.change(brewery(), { target: { value: "Ruosniemen Panimo" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "Add “Ruosniemen Panimo” as a new brewery" }));

    const fieldset = screen.getByRole("group", { name: "New brewery" });
    expect(within(fieldset).getByLabelText("Brewery name")).toHaveValue("Ruosniemen Panimo");
    fill("Country", "FI");
    fill("City (optional)", "Pori");
    fill("Style", "Porter");
    fill("Strength (ABV %)", "6,5");
    submit();

    await waitFor(() => expect(push).toHaveBeenCalled());
    expect(requests.find((request) => request.method === "POST")?.body).toEqual({
      name: "Ruosniemen Porter",
      style: "Porter",
      abv: 6.5,
      newBrewery: { name: "Ruosniemen Panimo", countryCode: "FI", city: "Pori" },
    });
  });

  it("says the beer is already in the catalog and links to it on the API's 409", async () => {
    posted = {
      status: 409,
      body: { status: 409, detail: "The catalog already has this beer", existingBeerId: oo.id },
    };
    await openForm("en", "öö");
    await fillValidBeer();

    submit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Öö (Põhjala) is already in the catalog.");
    expect(within(alert).getByRole("link", { name: "Open Öö" })).toHaveAttribute("href", `/en/beers/${oo.id}`);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it("offers the existing brewery when a new one duplicates it, and picks it", async () => {
    posted = { status: 409, body: { status: 409, existingBreweryId: pohjala.id } };
    await openForm();
    fireEvent.focus(brewery());
    fireEvent.change(brewery(), { target: { value: "Põhjala" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: "Add “Põhjala” as a new brewery" }));
    fill("Country", "EE");
    fill("Style", "Imperial Stout");
    fill("Strength (ABV %)", "12.5");

    submit();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Põhjala (Tallinn, Estonia) is already in the catalog.");
    fireEvent.click(within(alert).getByRole("button", { name: "Use it" }));
    expect(screen.queryByRole("group", { name: "New brewery" })).not.toBeInTheDocument();
    expect(brewery()).toHaveValue("Põhjala");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("catches invalid input before sending anything", async () => {
    await openForm("en", "");
    fill("Strength (ABV %)", "120");

    submit();

    expect(await screen.findByText("Give the beer a name.")).toBeInTheDocument();
    expect(screen.getByText("Choose a brewery, or add a new one.")).toBeInTheDocument();
    expect(screen.getByText("Choose a style.")).toBeInTheDocument();
    expect(screen.getByText("Give a strength between 0 and 100 %.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
    expect(requests.some((request) => request.method === "POST")).toBe(false);
  });

  // The client's own rules all pass here, so only handling the server's 400
  // shows anything: a form that knew only its own validation would sit silent.
  it("shows a rejection the client did not predict, on the field the server named", async () => {
    posted = {
      status: 400,
      body: { status: 400, detail: "Validation failed", errors: [{ field: "name", message: "must not contain control characters" }] },
    };
    await openForm();
    await fillValidBeer();

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Kalia did not accept this beer. Check the marked field and try again.",
    );
    expect(screen.getByText("Kalia did not accept this value.")).toBeInTheDocument();
    expect(screen.getByLabelText("Name")).toHaveAttribute("aria-invalid", "true");
  });

  it("says a rejection of a field the form does not have was a rejection all the same", async () => {
    posted = { status: 400, body: { status: 400, errors: [{ field: "beer", message: "?" }] } };
    await openForm();
    await fillValidBeer();

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Kalia did not accept this beer. Check it and try again.");
  });

  it("says the beer could not be added when the backend fails", async () => {
    posted = { status: 503, body: {} };
    await openForm();
    await fillValidBeer();

    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not add the beer. Please try again.");
  });

  it("shows the pending button while the beer is being added", async () => {
    let release: () => void = () => {};
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string, init?: RequestInit) =>
        init?.method === "POST" ? new Promise<Response>((resolve) => (release = () => resolve(new Response(null, { status: 503 })))) : backend(input, init),
      ),
    );
    await openForm();
    await fillValidBeer();

    submit();

    const pending = await screen.findByRole("button", { name: "Adding…" });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute("data-pending");
    release();
  });

  it("says the form could not load, and loads it on a retry", async () => {
    let failing = true;
    vi.stubGlobal(
      "fetch",
      vi.fn((input: string, init?: RequestInit) =>
        failing ? Promise.resolve(new Response(null, { status: 503 })) : backend(input, init),
      ),
    );
    renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Add a beer" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load the form. Please try again.");
    failing = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByLabelText("Name")).toBeInTheDocument();
  });

  it("closes the brewery list on Escape before closing the dialog", async () => {
    await openForm();
    fireEvent.focus(brewery());
    fireEvent.change(brewery(), { target: { value: "Põh" } });
    await screen.findByRole("option", { name: /^Põhjala/ });

    fireEvent.keyDown(brewery(), { key: "Escape" });

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: /^Põhjala/ })).not.toBeInTheDocument();
  });

  it("picks a brewery with the keyboard", async () => {
    await openForm();
    fireEvent.focus(brewery());
    fireEvent.change(brewery(), { target: { value: "Põh" } });
    await screen.findByRole("option", { name: /^Põhjala/ });

    fireEvent.keyDown(brewery(), { key: "ArrowDown" });
    fireEvent.keyDown(brewery(), { key: "ArrowUp" });
    fireEvent.keyDown(brewery(), { key: "Enter" });

    expect(brewery()).toHaveValue("Põhjala");
    expect(await screen.findByText("Tallinn, Estonia", { selector: "p" })).toBeInTheDocument();
  });

  it.each(["en", "fi"] as const)("has no a11y violations with every state on screen, in %s", async (locale) => {
    posted = { status: 409, body: { status: 409, existingBeerId: oo.id } };
    const { baseElement } = await openForm(locale);
    const combobox = screen.getByRole("combobox", { name: locale === "en" ? "Brewery" : "Panimo" });
    fireEvent.focus(combobox);
    fireEvent.change(combobox, { target: { value: "Põh" } });
    fireEvent.mouseDown(await screen.findByRole("option", { name: /^Põhjala/ }));
    fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Add beer" : "Lisää olut" }));
    await screen.findAllByText(locale === "en" ? "Choose a style." : "Valitse tyyli.");

    expect(await axe(baseElement)).toHaveNoViolations();
  });
});
