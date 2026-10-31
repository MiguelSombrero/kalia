import { redirectAuthCallback } from "@/lib/auth/redirectAuthCallback";

export const redirectSystemPath = ({ path }: { path: string; initial: boolean }): string =>
  redirectAuthCallback(path);
