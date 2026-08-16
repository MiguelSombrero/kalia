import { verifyRequiredConfiguration } from "@/lib/config/requiredConfiguration";
import { logger } from "@/lib/logger";

export const register = () => {
  // Next.js also invokes register() for the edge runtime (proxy.ts), where
  // process.exit doesn't exist — stay Node-only, per
  // node_modules/next/dist/docs/01-app/02-guides/instrumentation.md.
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  try {
    verifyRequiredConfiguration(process.env);
  } catch (error) {
    // A thrown instrumentation hook does not stop the server from listening
    // (measured on next@16.2.10): it logs the error and answers every
    // request with a 500 instead. process.exit is what actually achieves
    // fail-fast here (ADR-0018).
    logger.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};
