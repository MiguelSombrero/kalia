import { createHash, timingSafeEqual } from "node:crypto";

const digest = (value: string): Buffer => createHash("sha256").update(value).digest();

/**
 * Whether `authorization` carries `METRICS_TOKEN` as a bearer token. Both
 * sides are hashed first so the comparison takes the same time whatever the
 * length or content of what was presented.
 */
export const hasMetricsToken = (authorization: string | null, token: string): boolean =>
  authorization !== null && timingSafeEqual(digest(authorization), digest(`Bearer ${token}`));
