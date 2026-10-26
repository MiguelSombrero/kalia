import "server-only";
import { isIP } from "node:net";
import { headers } from "next/headers";
import { unstable_rethrow } from "next/navigation";

/**
 * The address of whoever sent the request being served, as the edge proxy
 * forwarded it (ADR-0090). `undefined` outside a request, and when the header
 * does not hold a single IP address — which is also what a request that
 * bypassed the proxy looks like under `npm run dev`.
 */
export const currentClientAddress = async (): Promise<string | undefined> => {
  try {
    const forwarded = (await headers()).get("x-forwarded-for")?.trim();
    return forwarded && isIP(forwarded) ? forwarded : undefined;
  } catch (error) {
    unstable_rethrow(error);
    return undefined;
  }
};
