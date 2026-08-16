export type LogLevel = "debug" | "info" | "warn" | "error";

// Reads console[level] at call time rather than capturing it at module load,
// so tests can vi.spyOn(console, level) after this module is imported.
const log = (level: LogLevel, message: unknown, ...args: unknown[]): void => {
  console[level](message, ...args);
};

// Every call site's only dependency on `console` — swap for a real
// monitoring client without touching callers.
export const logger = {
  debug: (message: unknown, ...args: unknown[]) => log("debug", message, ...args),
  info: (message: unknown, ...args: unknown[]) => log("info", message, ...args),
  warn: (message: unknown, ...args: unknown[]) => log("warn", message, ...args),
  error: (message: unknown, ...args: unknown[]) => log("error", message, ...args),
};
