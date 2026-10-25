import "server-only";
import { headers } from "next/headers";

/**
 * The `traceparent` of the request being served, which proxy.ts guarantees
 * every page and action has. `undefined` outside a request (a build, a test),
 * where `headers()` throws.
 */
export const currentTraceparent = async (): Promise<string | undefined> => {
  try {
    return (await headers()).get("traceparent") ?? undefined;
  } catch {
    return undefined;
  }
};
