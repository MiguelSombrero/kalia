/**
 * The fetch function every generated orval call goes through (configured as
 * `override.mutator` in orval.config.ts). Adds the backend base URL and
 * parses JSON — orval's stock fetch client does neither (it returns the raw
 * response text uncast).
 */
export const kaliaFetch = async <T,>(url: string, options: RequestInit): Promise<T> => {
  const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const response = await fetch(`${backendUrl}${url}`, options);

  let body: unknown = null;
  if (![204, 205, 304].includes(response.status)) {
    const text = await response.text();
    // Bodyless error responses (e.g. an infra layer failing before the
    // backend's own problem+json is produced) must not crash the caller —
    // it checks .status before ever touching .data in that case.
    body = text ? JSON.parse(text) : null;
  }

  return {
    data: body,
    status: response.status,
    headers: response.headers,
  } as T;
};
