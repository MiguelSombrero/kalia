import { render, screen } from "@testing-library/react";
import type { ReactElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { redirect } = vi.hoisted(() => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock("next/navigation", () => ({ redirect }));

import { ReviewQueue } from "./ReviewQueue";
import type { QueuePage } from "./types";

const suggestion = (overrides: Record<string, unknown> = {}) => ({
  id: "s1",
  name: "Hazy Hammer",
  style: "New England IPA",
  abv: 6.2,
  brewery: { id: "b1", name: "Sahalahti Brewing Co.", countryCode: "FI", city: "Sahalahti" },
  breweryIsNew: true,
  contributor: { username: "maltaanmies", pendingCount: 1, rejectedCount: 2 },
  suggestedAt: new Date(Date.now() - 4 * 24 * 3600e3).toISOString(),
  ...overrides,
});

let answer: { status: number; body: unknown };
const requests: URL[] = [];

const props = { loadOptions: async () => ({ styles: [], countries: [] }), findBreweries: async () => [] };
const queueOf = async (page = 0, locale: "en" | "fi" = "en"): Promise<QueuePage> =>
  ((await ReviewQueue({ locale, page, ...props })) as ReactElement<{ queue: QueuePage }>).props.queue;

beforeEach(() => {
  requests.length = 0;
  redirect.mockClear();
  answer = { status: 200, body: { content: [suggestion()], page: 0, totalElements: 1, totalPages: 1 } };
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string) => {
      requests.push(new URL(input));
      return new Response(JSON.stringify(answer.body), { status: answer.status, headers: { "Content-Type": "application/json" } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ReviewQueue", () => {
  it("asks for one page of the queue, in one backend call", async () => {
    await queueOf(2);

    expect(requests).toHaveLength(1);
    expect(requests[0].pathname).toBe("/api/v1/admin/suggestions");
    expect(requests[0].searchParams.get("page")).toBe("2");
  });

  it("names each brewery's place in the reader's language and words how long ago it was suggested", async () => {
    const en = (await queueOf(0, "en")).rows[0];
    const fi = (await queueOf(0, "fi")).rows[0];

    expect(en.brewery.place).toBe("Sahalahti, Finland");
    expect(fi.brewery.place).toBe("Sahalahti, Suomi");
    expect(en.waited).not.toBe(fi.waited);
    expect(en).toMatchObject({ username: "maltaanmies", pendingCount: 1, rejectedCount: 2, breweryIsNew: true });
  });

  it("carries a contributor with no username, and a brewery with no city", async () => {
    answer.body = {
      content: [suggestion({ contributor: { pendingCount: 1, rejectedCount: 0 }, brewery: { id: "b2", name: "Boon", countryCode: "BE" } })],
      page: 0,
      totalElements: 1,
      totalPages: 1,
    };

    const { rows } = await queueOf();

    expect(rows[0].username).toBeUndefined();
    expect(rows[0].brewery.place).toBe("Belgium");
  });

  it("says when the queue could not be loaded, with a way to try again", async () => {
    answer = { status: 500, body: { status: 500, title: "Internal Server Error" } };

    render((await ReviewQueue({ locale: "en", page: 0, ...props })) as ReactElement);

    expect(screen.getByRole("alert")).toHaveTextContent("The suggestions could not be loaded.");
    expect(screen.getByRole("link", { name: "Try again" })).toHaveAttribute("href", "/en/admin");
  });

  it("sends a page past the end of a queue that shrank to the last page", async () => {
    answer.body = { content: [], page: 4, totalElements: 41, totalPages: 3 };

    await expect(queueOf(4)).rejects.toThrow("NEXT_REDIRECT /en/admin?page=3");
  });

  it("shows an empty queue as an empty first page, not a redirect", async () => {
    answer.body = { content: [], page: 0, totalElements: 0, totalPages: 0 };

    expect((await queueOf()).rows).toEqual([]);
    expect(redirect).not.toHaveBeenCalled();
  });
});
