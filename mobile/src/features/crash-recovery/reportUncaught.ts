import { isApiError } from "@kalia/api";
import { logError, scrub } from "@/lib/log/deviceLog";

const MESSAGE_LIMIT = 200;
const STACK_FRAMES = 5;

export type UncaughtSource = "render" | "global";

export const logUncaught = (error: Error, source: UncaughtSource): void => {
  logError("Uncaught error", {
    source,
    name: error.name,
    error: scrub(error.message).slice(0, MESSAGE_LIMIT),
    traceId: isApiError(error) ? error.traceId : undefined,
    stack: error.stack ? scrub(error.stack.split("\n").slice(1, STACK_FRAMES + 1).join("\n")) : undefined,
  });
};
