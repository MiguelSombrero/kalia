import { verifyRequiredConfiguration } from "@/lib/config/requiredConfiguration";

export const register = () => {
  // Next.js also invokes register() for the edge runtime that runs proxy.ts
  // (confirmed: this file is bundled into its edge chunk). process.exit does
  // not exist there, so this must stay Node-only, exactly as
  // node_modules/next/dist/docs/01-app/02-guides/instrumentation.md's own
  // "Importing runtime-specific code" example recommends.
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
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
};
