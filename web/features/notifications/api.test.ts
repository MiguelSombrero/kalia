import { afterEach, describe, expect, it, vi } from "vitest";
import { isApiError } from "@kalia/api";
import { acknowledgeNotification, readNotifications, readUnreadCount } from "./api";

const id = "9d3b7e0a-6f1c-4c52-8a57-0c1d2e3f4a5b";

const stub = (response: Response) => {
  const fetchMock = vi.fn(async () => response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

const requested = (fetchMock: ReturnType<typeof stub>) => {
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  return { url: new URL(url, "http://backend"), method: init.method };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readUnreadCount", () => {
  it("is the count the API gives, read with one call that asks for nothing else", async () => {
    const fetchMock = stub(Response.json({ count: 3 }));

    expect(await readUnreadCount()).toBe(3);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(requested(fetchMock).url.pathname).toBe("/api/v1/notifications/unread-count");
  });

  it("throws a tagged http error for a server error", async () => {
    stub(new Response(null, { status: 500 }));

    await expect(readUnreadCount()).rejects.toSatisfy((error) => isApiError(error) && error.kind === "http" && error.status === 500);
  });
});

describe("readNotifications", () => {
  it("reads the first page, bounded", async () => {
    const page = { content: [], page: 0, totalElements: 0, totalPages: 0 };
    const fetchMock = stub(Response.json(page));

    expect(await readNotifications()).toEqual(page);

    const { url } = requested(fetchMock);
    expect(url.pathname).toBe("/api/v1/notifications");
    expect(url.searchParams.get("page")).toBe("0");
    expect(url.searchParams.get("size")).toBe("20");
  });
});

describe("acknowledgeNotification", () => {
  it("deletes the notification and says it was acknowledged", async () => {
    const fetchMock = stub(new Response(null, { status: 204 }));

    expect(await acknowledgeNotification(id)).toBe("acknowledged");

    expect(requested(fetchMock)).toMatchObject({ method: "DELETE" });
    expect(requested(fetchMock).url.pathname).toBe(`/api/v1/notifications/${id}`);
  });

  it("says a notification that is gone is gone, whatever the reason", async () => {
    stub(new Response(null, { status: 404 }));

    expect(await acknowledgeNotification(id)).toBe("gone");
  });

  it("throws for anything else, so the failure is not mistaken for an answer", async () => {
    stub(new Response(null, { status: 500 }));

    await expect(acknowledgeNotification(id)).rejects.toSatisfy((error) => isApiError(error) && error.status === 500);
  });
});
