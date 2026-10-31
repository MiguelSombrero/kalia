import { apiError, isApiError } from "./api-error";
import type { Transport } from "./transport";

/**
 * Generous against the <300 ms catalog search target
 * (docs/architecture.md): fires only on a hung backend or network.
 */
const DEFAULT_TIMEOUT_MS = 10_000;

export type FetchTransportConfig = {
  /** Read on every call, so an app can take it from a late-bound source. */
  baseUrl: () => string;
  /** The signed-in caller's access token; `undefined` sends no Authorization header at all. */
  accessToken?: () => Promise<string | undefined>;
  timeoutMs?: number;
};

type BackendResult = { data: unknown; status: number; headers: Headers };

/** A caller-initiated abort is cancellation, not failure. */
export const isAbortError = (cause: unknown): boolean =>
  typeof cause === "object" && cause !== null && "name" in cause && cause.name === "AbortError";

// Every message names a path, never the query string (ADR-0013).
export const pathOf = (url: string): string => url.split("?", 1)[0];

/**
 * The platform-neutral half of a transport: adds the base URL and the
 * caller's token, bounds the wait and parses JSON — orval's stock fetch
 * client does none of it, returning raw response text uncast. What is an
 * app's own (the web's trace headers, metrics and logging) wraps this.
 *
 * Non-2xx statuses are returned, not thrown: a 404 from `getBeer` means "no
 * such beer", not a failure. Only losing the request or the body raises, as
 * an `ApiError` (ADR-0023).
 */
export const createFetchTransport = (config: FetchTransportConfig): Transport =>
  (async (url: string, options: RequestInit): Promise<BackendResult> => {
    refuseReshapedPath(url);
    const request = await withAccessToken(url, options, config.accessToken);

    let response: Response;
    try {
      response = await withTimeout(
        fetch(`${config.baseUrl()}${url}`, request),
        url,
        config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      );
    } catch (cause) {
      // TanStack Query recognises the original AbortError and would treat a
      // wrapper as a real error, retrying a query the user already left.
      if (isAbortError(cause) || isApiError(cause)) {
        throw cause;
      }
      throw apiError("network", `Could not reach the backend for ${pathOf(url)}`, { cause });
    }

    return { data: await readBody(url, response), status: response.status, headers: response.headers };
  }) as Transport;

const readBody = async (url: string, response: Response): Promise<unknown> => {
  if ([204, 205, 304].includes(response.status)) {
    return null;
  }
  let text: string;
  try {
    text = await response.text();
  } catch (cause) {
    // The connection dropped part-way through the body.
    throw apiError("network", `Response body from ${pathOf(url)} could not be read`, {
      status: response.status,
      cause,
    });
  }
  // A bodyless error response must not crash the caller, which checks
  // .status before touching .data.
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (cause) {
    // A proxy or gateway answering with HTML rather than problem+json.
    throw apiError("parse", `Response body from ${pathOf(url)} was not JSON`, {
      status: response.status,
      cause,
    });
  }
};

// Orval's `urlEncodeParameters` is not enough on its own: `encodeURIComponent`
// leaves `.` and `..` intact, and fetch's URL parser resolves them — `%2e`
// spellings too — so `/api/v1/cellars/..` would reach `/api/v1/`.
const refuseReshapedPath = (url: string): void => {
  const path = pathOf(url);
  const segments = path.split("/").slice(1);
  const reshaped = segments.some((segment) => segment === "" || /^(\.|%2e){1,2}$/i.test(segment));
  if (reshaped) {
    throw apiError("refused", `Refused to call ${path}: a path segment is empty or a dot segment`);
  }
};

/**
 * Adds the caller's bearer token, which the backend needs on everything but
 * the catalog (ADR-0028). Nobody signed in means no Authorization header at
 * all rather than an empty one.
 *
 * A caller-supplied Authorization header is refused rather than honoured or
 * overwritten: the transport's token is the only one an app ever sends, and a
 * header derived from request input would otherwise be forwarded verbatim.
 */
const withAccessToken = async (
  url: string,
  options: RequestInit,
  accessToken: FetchTransportConfig["accessToken"],
): Promise<RequestInit> => {
  const headers = new Headers(options.headers);
  if (headers.has("Authorization")) {
    throw apiError("refused", `Refused to call ${pathOf(url)}: a caller-set Authorization header`);
  }
  const token = await accessToken?.();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return { ...options, headers };
};

/**
 * Do not replace this timer race with an `AbortSignal`. Next.js opts a
 * request out of per-render memoization as soon as a signal is present
 * (`next/dist/docs/01-app/03-api-reference/04-functions/fetch.md`), and the
 * beer detail route fetches the same beer twice per render — in
 * `generateMetadata` and in the page — so a signal here doubles every
 * detail-page request. The trade-off is that a timed-out request is
 * abandoned rather than cancelled; the caller's own signal passes through
 * untouched, so TanStack Query cancellation still works.
 */
const withTimeout = async (request: Promise<Response>, url: string, timeoutMs: number): Promise<Response> => {
  // The race leaves this promise unobserved when the timer wins; without a
  // handler its eventual rejection surfaces as an unhandled rejection.
  request.catch(() => {});

  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(apiError("timeout", `Request to ${pathOf(url)} timed out after ${timeoutMs} ms`)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([request, expiry]);
  } finally {
    clearTimeout(timer);
  }
};
