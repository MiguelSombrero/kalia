import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createInstance } from "i18next";
import { axe } from "jest-axe";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import enCommon from "@kalia/locales/en/common.json";
import fiCommon from "@kalia/locales/fi/common.json";
import { getOptions, type Locale } from "@/i18n/settings";

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { ReviewWorkspace } from "./ReviewWorkspace";
import type { BreweryOption, EditOptions, QueuePage, SuggestionRow } from "./types";

// The real chain runs — workspace, hooks, Server Actions, api.ts, kaliaFetch —
// against a stubbed backend, so these tests see the API's own responses.
const row = (overrides: Partial<SuggestionRow> & Pick<SuggestionRow, "id" | "name">): SuggestionRow => ({
  style: "Baltic Porter",
  abv: 10.5,
  brewery: { id: "b-pohjala", name: "Põhjala", countryCode: "EE", city: "Tallinn", place: "Tallinn, Estonia" },
  breweryIsNew: false,
  username: "olutharrastaja_88",
  pendingCount: 3,
  rejectedCount: 0,
  suggestedAt: "2026-11-01T16:00:00Z",
  waited: "5 days ago",
  ...overrides,
});
const sahalahti = { id: "b-sah", name: "Sahalahti Brewing Co.", countryCode: "FI", city: "Sahalahti", place: "Sahalahti, Finland" };
const loyly = { id: "b-loy", name: "Löyly Brew Lab", countryCode: "FI", city: "Helsinki", place: "Helsinki, Finland" };

const typo = row({ id: "s-typo", name: "Oo Imperial Baltik Porter" });
const hazy = row({ id: "s-hazy", name: "Hazy Hammer", style: "New England IPA", abv: 6.2, brewery: sahalahti, breweryIsNew: true, username: "maltaanmies" });
const sauna = row({ id: "s-sauna", name: "Sauna Session IPA", style: "Session IPA", abv: 4.5, brewery: loyly, breweryIsNew: true, username: "kaljakalle" });
const stout = row({ id: "s-stout", name: "Löyly Stout", style: "Oatmeal Stout", abv: 5.8, brewery: loyly, breweryIsNew: true, username: "saunamestari" });
const nameless = row({ id: "s-nameless", name: "Oude Kriek", style: "Fruit Lambic", username: undefined, pendingCount: 1 });

const options: EditOptions = {
  styles: ["Baltic Porter", "Imperial Stout", "New England IPA"],
  countries: [
    { code: "EE", name: "Estonia" },
    { code: "FI", name: "Finland" },
  ],
};
const pohjala: BreweryOption = { id: "b-pohjala", name: "Põhjala", place: "Tallinn, Estonia" };
const lervig: BreweryOption = { id: "b-lervig", name: "Lervig", place: "Stavanger, Norway" };

const decisionFor = (r: SuggestionRow, extra: Record<string, unknown> = {}) => ({
  id: r.id,
  name: r.name,
  style: r.style,
  abv: r.abv,
  brewery: { id: r.brewery.id, name: r.brewery.name, countryCode: r.brewery.countryCode, city: r.brewery.city },
  breweryStatus: "APPROVED",
  decidedAt: "2026-11-06T12:00:00Z",
  outcome: "APPROVED",
  ...extra,
});

type Answer = { status: number; body: unknown };
let answer: Answer;
const requests: { method: string; path: string; body?: Record<string, unknown> }[] = [];

const backend = async (input: string, init: RequestInit = {}) => {
  const url = new URL(input);
  requests.push({ method: init.method ?? "GET", path: url.pathname, body: init.body ? JSON.parse(String(init.body)) : undefined });
  return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { "Content-Type": "application/json" } });
};

const queue = (rows: SuggestionRow[], overrides: Partial<QueuePage> = {}): QueuePage => ({
  rows,
  page: 0,
  totalPages: 1,
  totalElements: rows.length,
  ...overrides,
});

const renderWorkspace = (rows: SuggestionRow[], locale: Locale = "en", overrides: Partial<QueuePage> = {}) => {
  const i18n = createInstance();
  i18n.use(initReactI18next).init({ ...getOptions(locale), resources: { en: { common: enCommon }, fi: { common: fiCommon } } });
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const findBreweries = vi.fn(async (query: string): Promise<BreweryOption[]> => (query.startsWith("Lerv") ? [lervig] : [pohjala]));
  const rendered = render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={i18n}>
        <ReviewWorkspace
          locale={locale}
          queue={queue(rows, overrides)}
          pager={<nav aria-label="pager" />}
          loadOptions={async () => options}
          findBreweries={findBreweries}
        />
      </I18nextProvider>
    </QueryClientProvider>,
  );
  return { ...rendered, findBreweries };
};

const posted = () => requests.filter((request) => request.method === "POST");

beforeEach(() => {
  requests.length = 0;
  answer = { status: 200, body: {} };
  vi.stubGlobal("fetch", vi.fn(backend));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const rejectWith = (reason: string) => {
  fireEvent.click(screen.getByRole("button", { name: "Reject" }));
  const dialog = screen.getByRole("dialog");
  fireEvent.click(within(dialog).getByRole("radio", { name: reason }));
  fireEvent.click(within(dialog).getByRole("button", { name: "Reject suggestion" }));
};

describe("the review workspace", () => {
  it("shows the first suggestion beside the queue, with its beer, brewery, contributor and counts", async () => {
    const { container } = renderWorkspace([typo, hazy]);

    expect(screen.getByText("2 waiting, oldest first")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Oo Imperial Baltik Porter" })).toBeInTheDocument();
    const facts = screen.getByText("Brewery", { selector: "dt" }).closest("dl")!;
    expect(within(facts).getByText("Põhjala")).toBeInTheDocument();
    expect(within(facts).getByText("olutharrastaja_88")).toBeInTheDocument();
    expect(within(facts).getByText(/3 waiting/)).toBeInTheDocument();
    expect(within(facts).getByText(/0 rejected/)).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("opens the suggestion the admin picks from the queue", () => {
    renderWorkspace([typo, hazy]);

    fireEvent.click(screen.getByRole("button", { name: /Hazy Hammer/ }));

    expect(screen.getByRole("heading", { level: 2, name: "Hazy Hammer" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Hazy Hammer/ })).toHaveAttribute("aria-current", "true");
  });

  it("says a contributor with no username has none yet, in the queue and on the suggestion", async () => {
    const { container } = renderWorkspace([nameless]);

    expect(screen.getAllByText(/No username yet/)).toHaveLength(2);
    expect(await axe(container)).toHaveNoViolations();
  });

  it("is an empty state when nothing waits", async () => {
    const { container } = renderWorkspace([]);

    expect(screen.getByRole("heading", { name: "Nothing is waiting" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("reads in Finnish", async () => {
    const { container } = renderWorkspace([hazy], "fi");

    expect(screen.getByText("1 odottaa, vanhin ensin")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hyväksy olut ja panimo" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe("approving", () => {
  it("approves a suggestion with an existing brewery as it is, in one call", async () => {
    answer = { status: 200, body: decisionFor(typo) };
    renderWorkspace([typo]);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByText("Approved. Oo Imperial Baltik Porter is in the catalog.")).toBeInTheDocument();
    expect(posted()).toEqual([{ method: "POST", path: "/api/v1/admin/suggestions/s-typo/approval", body: undefined }]);
  });

  it("presents a new brewery as approved together with its beer, on a button that says both", async () => {
    answer = { status: 200, body: decisionFor(hazy) };
    const { container } = renderWorkspace([hazy]);

    expect(screen.getByRole("button", { name: "Approve beer and brewery" })).toBeInTheDocument();
    expect(screen.getAllByText("New brewery")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Approve beer and brewery" }));

    expect(await screen.findByText("Approved. Hazy Hammer and Sahalahti Brewing Co. are in the catalog.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("offers the next suggestion once one is decided", async () => {
    answer = { status: 200, body: decisionFor(typo) };
    renderWorkspace([typo, hazy]);
    fireEvent.click(screen.getByRole("button", { name: "Approve" }));
    await screen.findByText(/^Approved\./);

    fireEvent.click(screen.getByRole("button", { name: "Next suggestion" }));

    expect(screen.getByRole("heading", { level: 2, name: "Oo Imperial Baltik Porter" })).toBeInTheDocument();
  });
});

describe("rejecting", () => {
  it("asks first, and takes no reason until the admin picks one", async () => {
    renderWorkspace([typo]);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    const dialog = screen.getByRole("dialog", { name: "Do you really want to reject this suggestion?" });
    expect(within(dialog).getAllByRole("radio")).toHaveLength(4);
    expect(within(dialog).getAllByRole("radio").every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
    expect(within(dialog).getByRole("button", { name: "Reject suggestion" })).toBeDisabled();
    expect(posted()).toEqual([]);
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it("sends the chosen reason, closes the dialog and reports by toast and on the suggestion", async () => {
    answer = { status: 200, body: decisionFor(typo, { outcome: "REJECTED", reason: "NOT_A_REAL_BEER" }) };
    renderWorkspace([typo]);

    rejectWith("Not a real beer");

    expect(await screen.findByText("Rejected: Not a real beer.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(posted()).toEqual([
      { method: "POST", path: "/api/v1/admin/suggestions/s-typo/rejection", body: { reason: "NOT_A_REAL_BEER" } },
    ]);
    expect(screen.getByText("Rejected Oo Imperial Baltik Porter.")).toBeInTheDocument();
  });

  it("says a new brewery is rejected with its beer when no other suggestion needs it", async () => {
    answer = { status: 200, body: decisionFor(hazy, { outcome: "REJECTED", reason: "INAPPROPRIATE", breweryStatus: "REJECTED" }) };
    renderWorkspace([hazy]);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(within(screen.getByRole("dialog")).getByText("Sahalahti Brewing Co. is rejected with it, unless another suggestion still needs it.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Inappropriate" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject suggestion" }));

    expect(await screen.findByText(/Rejected: Inappropriate\. Sahalahti Brewing Co\. is rejected with it\./)).toBeInTheDocument();
  });

  it("does not call a brewery rejected when another suggestion still needs it and it stays pending", async () => {
    answer = { status: 200, body: decisionFor(sauna, { outcome: "REJECTED", reason: "ALREADY_IN_CATALOG", breweryStatus: "PENDING" }) };
    renderWorkspace([sauna, stout]);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(within(screen.getByRole("dialog")).getByText("Löyly Brew Lab stays pending: another suggestion still needs it.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Already in the catalog" }));
    fireEvent.click(screen.getByRole("button", { name: "Reject suggestion" }));

    const panel = await screen.findByText(/^Rejected: Already in the catalog\./);
    expect(panel).toHaveTextContent("Löyly Brew Lab stays pending: another suggestion still needs it.");
    expect(panel).not.toHaveTextContent("rejected with it");
  });

  it("leaves nothing sent when the admin cancels", () => {
    renderWorkspace([typo]);

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(posted()).toEqual([]);
  });
});

describe("a decision that lost to another", () => {
  const problem = (outcome: string, decidedAt?: string) => ({ status: 409, title: "Conflict", outcome, ...(decidedAt ? { decidedAt } : {}) });

  it("says how the suggestion was decided, and when", async () => {
    answer = { status: 409, body: problem("APPROVED", "2026-11-06T11:54:00Z") };
    const { container } = renderWorkspace([typo, hazy]);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Already decided");
    expect(alert).toHaveTextContent(/Another admin approved this suggestion at .*2026.*\. Nothing was changed\./);
    expect(screen.getByRole("button", { name: "Next suggestion" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("says how it was decided when the decision's time was not recorded", async () => {
    answer = { status: 409, body: problem("REJECTED") };
    renderWorkspace([typo]);

    rejectWith("Not a real beer");

    expect(await screen.findByRole("alert")).toHaveTextContent("Another admin rejected this suggestion. Nothing was changed.");
  });

  it("says a suggestion decided meanwhile is no longer waiting when the read answers 404", async () => {
    answer = { status: 404, body: { status: 404, title: "Not Found" } };
    renderWorkspace([typo]);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("No longer waiting");
  });

  it("shows a failure that is neither, and changes nothing", async () => {
    answer = { status: 500, body: { status: 500, title: "Internal Server Error" } };
    renderWorkspace([typo]);

    fireEvent.click(screen.getByRole("button", { name: "Approve" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong and nothing was changed. Try again.");
    expect(screen.getByRole("button", { name: "Approve" })).toBeEnabled();
  });
});

describe("editing before approving", () => {
  const openEdit = async (rows: SuggestionRow[], locale: Locale = "en") => {
    const rendered = renderWorkspace(rows, locale);
    fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Edit and approve" : "Muokkaa ja hyväksy" }));
    await screen.findByLabelText(locale === "en" ? "Name" : "Nimi");
    return rendered;
  };
  const save = () => fireEvent.click(screen.getByRole("button", { name: "Save and approve" }));

  it("turns the suggestion's own fields into inputs, and says what was suggested once one changes", async () => {
    const { container } = await openEdit([typo]);

    expect(screen.getByLabelText("Name")).toHaveValue("Oo Imperial Baltik Porter");
    expect(screen.queryByText(/^Suggested:/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Öö Imperial Baltic Porter" } });

    expect(screen.getByText("Suggested: Oo Imperial Baltik Porter")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("approves the corrected beer in one edited-approval call and shows it as edited", async () => {
    answer = { status: 200, body: decisionFor(typo, { name: "Öö Imperial Baltic Porter" }) };
    await openEdit([typo]);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Öö Imperial Baltic Porter" } });

    save();

    expect(await screen.findByText("Approved as edited. The contributor sees “Öö Imperial Baltic Porter”.")).toBeInTheDocument();
    expect(posted()).toEqual([
      {
        method: "POST",
        path: "/api/v1/admin/suggestions/s-typo/edited-approval",
        body: { name: "Öö Imperial Baltic Porter", style: "Baltic Porter", abv: 10.5, breweryId: "b-pohjala" },
      },
    ]);
  });

  it("calls the choice for a suggestion that came with a new brewery New brewery, not as suggested, and sends its edited fields", async () => {
    answer = { status: 200, body: decisionFor(hazy, { brewery: { id: "b-sah", name: "Sahalahden Panimo", countryCode: "FI", city: "Sahalahti" } }) };
    await openEdit([hazy]);

    expect(screen.getByRole("radio", { name: "New brewery" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Existing brewery" })).not.toBeChecked();
    expect(screen.queryByText(/as suggested/i)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Brewery name"), { target: { value: "Sahalahden Panimo" } });
    expect(screen.getByText("Suggested: Sahalahti Brewing Co.")).toBeInTheDocument();
    save();

    await screen.findByText(/^Approved as edited\./);
    expect(posted()[0].body).toEqual({
      name: "Hazy Hammer",
      style: "New England IPA",
      abv: 6.2,
      newBrewery: { name: "Sahalahden Panimo", countryCode: "FI", city: "Sahalahti" },
    });
  });

  it("re-points the beer at an existing brewery the admin finds, and says which brewery was suggested", async () => {
    answer = { status: 200, body: decisionFor(hazy, { brewery: { id: "b-lervig", name: "Lervig", countryCode: "NO" } }) };
    await openEdit([hazy]);

    fireEvent.click(screen.getByRole("radio", { name: "Existing brewery" }));
    fireEvent.change(screen.getByLabelText("Find a brewery in the catalog"), { target: { value: "Lerv" } });
    fireEvent.click(await screen.findByRole("radio", { name: /Lervig/ }));
    expect(screen.getByText("Suggested: new brewery Sahalahti Brewing Co.")).toBeInTheDocument();
    save();

    await waitFor(() => expect(posted()).toHaveLength(1));
    expect(posted()[0].body).toEqual({ name: "Hazy Hammer", style: "New England IPA", abv: 6.2, breweryId: "b-lervig" });
  });

  it("holds a value the add path would refuse in the form, sends nothing, and marks the field", async () => {
    await openEdit([typo]);
    fireEvent.change(screen.getByLabelText("ABV, %"), { target: { value: "10.55" } });

    save();

    expect(await screen.findByText("Give the strength to one decimal at most.")).toBeInTheDocument();
    expect(screen.getByLabelText("ABV, %")).toHaveAttribute("aria-invalid", "true");
    expect(posted()).toEqual([]);
  });

  it("shows the server's 400 on the field it names, and the box above the form", async () => {
    answer = { status: 400, body: { status: 400, title: "Bad Request", errors: [{ field: "style", message: "unknown style" }] } };
    const { container } = await openEdit([typo]);

    save();

    expect(await screen.findByRole("alert")).toHaveTextContent("The catalog would not take this");
    expect(screen.getByLabelText("Style")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("The catalog did not accept this value.")).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("names the duplicate a 409 refused the edit for and links to the existing beer", async () => {
    answer = { status: 409, body: { status: 409, title: "Conflict", existingBeerId: "beer-1" } };
    await openEdit([typo]);

    save();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Already in the catalog");
    expect(within(alert).getByRole("link", { name: "Open it" })).toHaveAttribute("href", "/en/beers/beer-1");
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });

  it("names the duplicate brewery and offers it as an existing brewery", async () => {
    answer = { status: 409, body: { status: 409, title: "Conflict", existingBreweryId: "b-existing", existingBreweryName: "Sahalahti Panimo", existingBreweryCountryCode: "FI" } };
    await openEdit([hazy]);

    save();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Sahalahti Panimo in Finland is already in the catalog");
    fireEvent.click(within(alert).getByRole("button", { name: "Use Sahalahti Panimo" }));
    expect(screen.getByRole("radio", { name: "Existing brewery" })).toBeChecked();
    expect(screen.getByText("Chosen: Sahalahti Panimo · Finland")).toBeInTheDocument();
  });

  it("says a new brewery was approved meanwhile and offers it as an existing one", async () => {
    answer = { status: 409, body: { status: 409, title: "Conflict", detail: "brewery approved" } };
    await openEdit([hazy]);

    save();

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("That brewery was approved meanwhile");
    fireEvent.click(within(alert).getByRole("button", { name: "Use Sahalahti Brewing Co." }));
    expect(screen.getByText("Chosen: Sahalahti Brewing Co. · Sahalahti, Finland")).toBeInTheDocument();
  });

  it("shows a 409 from a concurrent decision as the suggestion's outcome", async () => {
    answer = { status: 409, body: { status: 409, title: "Conflict", outcome: "REJECTED", decidedAt: "2026-11-06T11:54:00Z" } };
    await openEdit([typo]);

    save();

    expect(await screen.findByRole("alert")).toHaveTextContent("Another admin rejected this suggestion");
  });

  it("reads in Finnish, with the choice of brewery named for what it is", async () => {
    const { container } = await openEdit([hazy], "fi");

    expect(screen.getByRole("radio", { name: "Uusi panimo" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Olemassa oleva panimo" })).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });

  it("goes back to the suggestion on Cancel without sending anything", async () => {
    await openEdit([typo]);

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.getByRole("button", { name: "Edit and approve" })).toBeInTheDocument();
    expect(posted()).toEqual([]);
  });
});
