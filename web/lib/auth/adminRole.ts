import { cache } from "react";
import { decodeJwt } from "jose";
import { currentAccessToken } from "@/lib/api/accessToken";

const ADMIN_ROLE = "admin";

// Decoded without verifying the signature, as sessionId.ts does: a display and
// routing decision, backed by the backend's own check on every call (ADR-0101).
export const hasAdminRole = (accessToken: string | undefined): boolean => {
  if (!accessToken) {
    return false;
  }
  try {
    const { realm_access: realmAccess } = decodeJwt(accessToken);
    const roles = (realmAccess as { roles?: unknown } | undefined)?.roles;
    return Array.isArray(roles) && roles.includes(ADMIN_ROLE);
  } catch {
    return false;
  }
};

// cache(): one read per request, shared by the header and the page.
export const currentUserIsAdmin = cache(async (): Promise<boolean> => {
  return hasAdminRole(await currentAccessToken());
});
