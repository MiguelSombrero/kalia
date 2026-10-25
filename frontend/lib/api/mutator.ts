import "server-only";
import { currentAccessToken } from "./accessToken";
import { apiError, isApiError } from "./api-error";

/**
 * Generous against the <300 ms catalog search target
 * (docs/architecture.md): fires only on a hung backend or network.
 */
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * The fetch function every generated orval call goes through (configured as
 * `override.mutator` in orval.config.ts). Adds the base URL, bounds the wait
 * and parses JSON — orval's stock fetch client does none of it, returning
 * raw response text uncast.
 *
 * Non-2xx statuses are returned, not thrown: a 404 from `getBeer` means "no
 * such beer", not a failure. Only losing the request or the body raises.
 */
export const kaliaFetch = async <T,>(url: string, options: RequestInit): Promise<T> => {
  // Fallback is for npm run dev only; production requiring this is enforced
  // in instrumentation.ts, not here (ADR-0018).
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  refuseReshapedPath(url);
  const request = await withAccessToken(url, options);

  let response: Response;
  try {
    response = await withTimeout(fetch(`${backendUrl}${url}`, request), url);
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
    // A bodyless error response must not crash the caller, which checks
    // .status before touching .data.
    if (text) {
      try {
        body = JSON.parse(text);
      } catch (cause) {
        // A proxy or gateway answering with HTML rather than problem+json.
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

// Orval's `urlEncodeParameters` is not enough on its own: `encodeURIComponent`
// leaves `.` and `..` intact, and fetch's URL parser resolves them — `%2e`
// spellings too — so `/api/v1/cellars/..` would reach `/api/v1/`.
const refuseReshapedPath = (url: string): void => {
  const [path] = url.split("?", 1);
  const segments = path.split("/").slice(1);
  const reshaped = segments.some(
    (segment) => segment === "" || /^(\.|%2e){1,2}$/i.test(segment),
  );
  if (reshaped) {
    throw apiError("refused", `Refused to call ${url}: a path segment is empty or a dot segment`);
  }
};

/**
 * Adds the caller's bearer token, which the backend needs on everything but
 * the catalog (ADR-0028). Returns `options` untouched when nobody is signed
 * in, so an anonymous request is byte-for-byte what it was before tokens
 * existed rather than one carrying an empty Authorization header.
 *
 * A caller-supplied Authorization header is refused rather than honoured or
 * overwritten: the session's token is the only one this BFF ever sends, and a
 * header derived from request input would otherwise be forwarded verbatim.
 */
const withAccessToken = async (url: string, options: RequestInit): Promise<RequestInit> => {
  const headers = new Headers(options.headers);
  if (headers.has("Authorization")) {
    throw apiError("refused", `Refused to call ${url}: a caller-set Authorization header`);
  }
  const token = await currentAccessToken();
  if (!token) {
    return options;
  }
  headers.set("Authorization", `Bearer ${token}`);
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
