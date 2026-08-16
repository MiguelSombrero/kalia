import { valkeyAdapter } from "./valkeyAdapter";

// Does not clear the session cookie: Next.js forbids setting cookies during
// Server Component rendering. The DB record is authoritative, so the
// orphaned cookie resolves to nothing on the next render.
export const endLocalSession = async (sessionToken: string): Promise<void> => {
  await valkeyAdapter.deleteSession?.(sessionToken);
};
