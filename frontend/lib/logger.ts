export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

const SEVERITY: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const isLogLevel = (value: string): value is LogLevel => value in SEVERITY;

// Read per call, not at module load, so a test can set it after importing.
const threshold = (): number => {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  return SEVERITY[configured && isLogLevel(configured) ? configured : "info"];
};

const serialisable = (_key: string, value: unknown): unknown => {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return typeof value === "bigint" ? value.toString() : value;
};

const toRecord = (level: LogLevel, message: unknown, fields: LogFields): string => {
  const error = message instanceof Error ? message : undefined;
  const text = error ? error.message : message;
  try {
    return JSON.stringify(
      { level, time: new Date().toISOString(), msg: text, ...(error && { error }), ...fields },
      serialisable,
    );
  } catch {
    // A circular field must cost the field, never the log line.
    return JSON.stringify({ level, time: new Date().toISOString(), msg: String(text) });
  }
};

// Reads console[level] at call time rather than capturing it at module load,
// so tests can vi.spyOn(console, level) after this module is imported.
const log = (level: LogLevel, message: unknown, fields?: LogFields): void => {
  // The browser's console renders objects and stack traces itself; a JSON
  // string there is worse to read and nothing collects it.
  if (typeof window !== "undefined") {
    console[level](...(fields === undefined ? [message] : [message, fields]));
    return;
  }
  if (SEVERITY[level] < threshold()) {
    return;
  }
  console[level](toRecord(level, message, fields ?? {}));
};

// Every call site's only dependency on `console`. On the server each call is
// one JSON object on one line (ADR-0088); `fields` are merged into it, so a
// field must never hold a token, a password or a request body (ADR-0013).
export const logger = {
  debug: (message: unknown, fields?: LogFields) => log("debug", message, fields),
  info: (message: unknown, fields?: LogFields) => log("info", message, fields),
  warn: (message: unknown, fields?: LogFields) => log("warn", message, fields),
  error: (message: unknown, fields?: LogFields) => log("error", message, fields),
};
