import { apiError, isApiError } from "./api-error";

/**
 * Generous against the <300 ms server time catalog search targets
 * (docs/architecture.md), so this fires only on a hung backend or network,
 * never on a slow-but-working request or a cold container start.
 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The fetch function every generated orval call goes through (configured as
 * `override.mutator` in orval.config.ts). Adds the backend base URL, bounds
 * the wait, and parses JSON — orval's stock fetch client does none of it (it
 * returns the raw response text uncast).
 *
 * Non-2xx statuses are returned rather than thrown: the caller decides what a
 * status means, and a 404 from `getBeer` means "no such beer", not a failure.
 * Only losing the request or the body raises from here.
 */
export const kaliaFetch = async <T,>(url: string, options: RequestInit): Promise<T> => {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";

  let response: Response;
  try {
    response = await withTimeout(fetch(`${backendUrl}${url}`, options), url);
  } catch (cause) {
    // A caller-initiated abort is cancellation, not failure: TanStack Query
    // recognises the original AbortError and would treat a wrapper as a real
    // error, retrying a query the user already navigated away from.
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    if (isApiError(cause)) {
      throw cause;
    }
    throw apiError("network", `Could not reach the backend for ${url}`, { cause });
  }

  let body: unknown = null;
  if (![204, 205, 304].includes(response.status)) {
    let text: string;
    try {
      text = await response.text();
    } catch (cause) {
      // The connection dropped part-way through the body.
      throw apiError("network", `Response body from ${url} could not be read`, {
        status: response.status,
        cause,
      });
    }
    // Bodyless error responses (e.g. an infra layer failing before the
    // backend's own problem+json is produced) must not crash the caller —
    // it checks .status before ever touching .data in that case.
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (cause) {
        // A proxy or gateway answering with HTML rather than the backend's
        // problem+json used to surface as an unhandled SyntaxError.
        throw apiError("parse", `Response body from ${url} was not JSON`, {
          status: response.status,
          cause,
        });
      }
    }
  }

  return {
    data: body,
    status: response.status,
    headers: response.headers,
  } as T;
};

/**
 * Bounds the wait by racing a timer rather than by passing an `AbortSignal`.
 * Next.js opts a request out of per-render memoization as soon as a signal is
 * present (`next/dist/docs/01-app/03-api-reference/04-functions/fetch.md`),
 * and the beer detail route fetches the same beer twice per render — once in
 * `generateMetadata`, once in the page — so a signal here would double every
 * detail-page request to the backend. The trade-off is that a timed-out
 * request is abandoned rather than cancelled; the caller's own signal is
 * passed through untouched, so TanStack Query cancellation still works.
 */
const withTimeout = async (request: Promise<Response>, url: string): Promise<Response> => {
  // The race leaves this promise unobserved when the timer wins; without a
  // handler its eventual rejection surfaces as an unhandled rejection.
  request.catch(() => {});

  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          apiError("timeout", `Request to ${url} timed out after ${REQUEST_TIMEOUT_MS} ms`),
        ),
      REQUEST_TIMEOUT_MS,
    );
  });

  try {
    return await Promise.race([request, expiry]);
  } finally {
    clearTimeout(timer);
  }
};
