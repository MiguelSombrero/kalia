#!/usr/bin/env node
// Prints what the observability profile holds about one request as plain text:
// its span tree, with the SQL it ran, and the log lines written under its trace
// id, in at most MAX_LINES lines (ADR-0114). With no id it lists the most
// recent failed requests instead.
//   node scripts/trace.mjs [<traceId>]          (`make trace [ID=<traceId>]`)
// It reads Grafana's data-source proxy on this worktree's GRAFANA_PORT, so it
// needs nothing but the profile (`make observability-up`). Exits 1 when the
// profile does not answer or holds nothing for the id.

import { fileURLToPath } from "node:url";

import { originOf, portOf, stackEnv } from "./stack-ports.mjs";

export const MAX_LINES = 150;
export const FAILED_LISTED = 10;
export const LOG_LINES_AT_CUT = 50;
export const RETENTION_MS = 72 * 3600 * 1000;

const LEVELS = ["TRACE", "DEBUG", "INFO", "WARN", "ERROR"];
const TRACE_ID = /^[0-9a-f]{32}$/i;
const SQL_ATTRIBUTES = ["jdbc.query[0]", "db.query.text", "db.statement"];
const STATUS_ATTRIBUTES = ["http.response.status_code", "http.status_code", "status"];
const SQL_LENGTH = 160;

// What ADR-0013 keeps out of a log, removed again here because the store may
// hold what a tier should not have written: a token, a credential field, an
// address, a query string. SQL text loses its quoted literals, so a bound value
// that an instrumentation inlined never prints.
const SECRET_FIELD = /\b(password|passwd|secret|token|authorization|cookie|api[_-]?key|client[_-]?secret)(["']?\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;&]+)/gi;
const QUERY_STRING = /(\/[^\s?"'<>]*)\?(?=[^\s"'<>]*=)[^\s"'<>]*/g;

export const scrub = (text) =>
  String(text)
    .replace(/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*/g, "[redacted]")
    .replace(SECRET_FIELD, "$1$2[redacted]")
    .replace(QUERY_STRING, "$1")
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[email]");

export const scrubSql = (statement) =>
  scrub(
    statement
      .replace(/'(?:[^']|'')*'/g, "?")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^(select(?: distinct)?) .{60,}? from /i, "$1 ... from "),
  ).slice(0, SQL_LENGTH);

/** Tempo returns ids as base64 in its JSON; the stack logs and prints hex. */
export const hexId = (id) => {
  if (!id) return "";
  return /^[0-9a-f]{16}$|^[0-9a-f]{32}$/i.test(id) ? id.toLowerCase() : Buffer.from(id, "base64").toString("hex");
};

const attributeValue = (value = {}) => value.stringValue ?? value.intValue ?? value.doubleValue ?? value.boolValue;

const attributesOf = (list = []) => Object.fromEntries(list.map(({ key, value }) => [key, attributeValue(value)]));

const nanosToMs = (nanos) => Number(BigInt(nanos ?? 0)) / 1e6;

/**
 * @param {object} body Tempo's `/api/v2/traces/<id>` response
 * @returns {{ id: string, parent: string, tier: string, name: string, startMs: number, durationMs: number, attributes: Record<string, unknown>, httpStatus?: number, failed: boolean }[]}
 */
export const parseTrace = (body) =>
  (body?.trace?.resourceSpans ?? body?.resourceSpans ?? []).flatMap((resource) => {
    const tier = String(attributesOf(resource.resource?.attributes)["service.name"] ?? "unknown");
    return (resource.scopeSpans ?? []).flatMap((scope) =>
      (scope.spans ?? []).map((span) => {
        const attributes = attributesOf(span.attributes);
        const reported = STATUS_ATTRIBUTES.map((name) => String(attributes[name] ?? "")).find((value) => /^\d{3}$/.test(value));
        const httpStatus = reported === undefined ? undefined : Number(reported);
        const startMs = nanosToMs(span.startTimeUnixNano);
        return {
          id: hexId(span.spanId),
          parent: hexId(span.parentSpanId),
          tier,
          name: String(span.name ?? ""),
          startMs,
          durationMs: nanosToMs(span.endTimeUnixNano) - startMs,
          attributes,
          httpStatus,
          failed: span.status?.code === "STATUS_CODE_ERROR" || (httpStatus ?? 0) >= 500 || attributes.outcome === "SERVER_ERROR",
        };
      }),
    );
  });

const formatMs = (ms) => (ms < 10 ? `${ms.toFixed(1)} ms` : `${Math.round(ms)} ms`);

const labelOf = (span) => {
  const statement = SQL_ATTRIBUTES.map((name) => span.attributes[name]).find((value) => typeof value === "string");
  if (statement) return `SQL ${scrubSql(statement)}`;
  const name = scrub(span.name).replace(/\([^)]{20,}\)/, "(...)");
  return span.httpStatus !== undefined && !name.includes(String(span.httpStatus)) ? `${name} -> ${span.httpStatus}` : name;
};

/** The spans as a forest: a span whose parent is not in the trace is a root. */
export const buildTree = (spans) => {
  const nodes = new Map(spans.map((span) => [span.id, { span, children: [] }]));
  const roots = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(node.span.parent);
    (parent ? parent.children : roots).push(node);
  }
  const byStart = (a, b) => a.span.startMs - b.span.startMs;
  for (const node of nodes.values()) node.children.sort(byStart);
  return roots.sort(byStart);
};

const signatures = new WeakMap();
const signature = (node) => {
  if (!signatures.has(node)) {
    signatures.set(node, `${node.span.tier}|${labelOf(node.span)}|${node.span.failed}|(${node.children.map(signature).join(",")})`);
  }
  return signatures.get(node);
};

/**
 * Sibling spans that are the same call with the same shape beneath it become
 * one entry with a count and the time they took together.
 */
const foldSiblings = (nodes) => {
  const groups = new Map();
  for (const node of nodes) {
    const key = signature(node);
    const group = groups.get(key);
    if (group) {
      group.count += 1;
      group.totalMs += node.span.durationMs;
    } else {
      groups.set(key, { node, count: 1, totalMs: node.span.durationMs });
    }
  }
  return [...groups.values()].map((group) => ({ ...group, children: foldSiblings(group.node.children) }));
};

const unfolded = (nodes) =>
  nodes.map((node) => ({ node, count: 1, totalMs: node.span.durationMs, children: unfolded(node.children) }));

const treeLines = (entries, depth = 0) =>
  entries.flatMap(({ node, count, totalMs, children }) => {
    const { span } = node;
    const timing = count > 1 ? `x ${count}, ${formatMs(totalMs)} together${node.children.length ? ", beneath the first only" : ""}` : formatMs(span.durationMs);
    const line = `${"  ".repeat(depth)}[${span.tier}] ${labelOf(span)}  ${timing}${span.failed ? "  FAILED" : ""}`;
    return [line, ...treeLines(children, depth + 1)];
  });

/**
 * @param {string} line one stdout line of a tier, or of a service that logs text
 * @returns {{ level: string, message: string }}
 */
export const parseLogLine = (line) => {
  let fields;
  try {
    fields = JSON.parse(line);
  } catch {
    fields = undefined;
  }
  if (fields && typeof fields === "object") {
    const rawLevel = fields.log?.level ?? fields["log.level"] ?? fields.level;
    const level = String(rawLevel ?? "info").toUpperCase().replace("WARNING", "WARN").replace("FATAL", "ERROR");
    const text = fields.message ?? fields.msg ?? "";
    const type = fields.error?.type ?? fields["error.type"];
    return { level: LEVELS.includes(level) ? level : "INFO", message: scrub(type ? `${text} (${type})` : text) };
  }
  const found = /\b(ERROR|WARN|WARNING|FATAL|SEVERE)\b/.exec(line)?.[1];
  const level = found ? found.replace("WARNING", "WARN").replace("SEVERE", "ERROR").replace("FATAL", "ERROR") : "INFO";
  return { level, message: scrub(line.trim()) };
};

/**
 * @param {object} body Loki's `query_range` response
 * @returns {{ atMs: number, service: string, level: string, message: string, traceId?: string }[]} oldest first
 */
export const parseLogs = (body) =>
  (body?.data?.result ?? [])
    .flatMap(({ stream, values }) =>
      values.map(([nanos, line]) => {
        let traceId;
        try {
          traceId = JSON.parse(line).traceId;
        } catch {
          traceId = /\b[0-9a-f]{32}\b/.exec(line)?.[0];
        }
        return { atMs: nanosToMs(nanos), service: stream?.service ?? "unknown", traceId, ...parseLogLine(line) };
      }),
    )
    .sort((a, b) => a.atMs - b.atMs);

const clock = (ms) => new Date(ms).toISOString().slice(11, 23);

const logLines = (logs, minLevel) => {
  const floor = LEVELS.indexOf(minLevel);
  return logs.filter((log) => LEVELS.indexOf(log.level) >= floor).map((log) => `${clock(log.atMs)} ${log.level.padEnd(5)} ${log.service}  ${log.message}`);
};

const extent = (spans) => ({
  first: spans.reduce((least, span) => Math.min(least, span.startMs), Infinity),
  last: spans.reduce((most, span) => Math.max(most, span.startMs + span.durationMs), -Infinity),
});

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;

/**
 * One request as at most MAX_LINES lines. Over the bound it first folds
 * repeated sibling spans into one counted line, then drops the log lines below
 * WARN, then cuts the tree and says how much it cut.
 * @returns {string[]}
 */
export const formatTrace = (traceId, spans, logs, max = MAX_LINES) => {
  const roots = buildTree(spans);
  const { first, last } = extent(spans);
  const tiers = [...new Set(spans.map((span) => span.tier))];
  const header =
    spans.length === 0
      ? `Trace ${traceId}: no spans stored (a trace is exported in batches, and the store keeps three days)`
      : `Trace ${traceId}  ${new Date(first).toISOString()}  ${plural(spans.length, "span")} in ${tiers.join(", ")}  ${formatMs(last - first)} wall`;
  const compose = ({ fold, minLevel }) => {
    const shown = logLines(logs, minLevel);
    const hidden = logs.length - shown.length;
    const notes = [];
    if (fold) notes.push("Repeated sibling spans are folded into one line with a count (x N).");
    if (hidden > 0) notes.push(`${plural(hidden, "log line")} below ${minLevel} not shown.`);
    const heading = shown.length === 0 ? "No log lines at this level for this trace id." : `Log lines (${shown.length}):`;
    return { tree: treeLines(fold ? foldSiblings(roots) : unfolded(roots)), logs: [heading, ...shown], notes };
  };
  const total = ({ tree, logs: written, notes }) => 1 + tree.length + written.length + notes.length;
  const stages = [
    { fold: false, minLevel: "TRACE" },
    { fold: true, minLevel: "TRACE" },
    { fold: true, minLevel: "WARN" },
  ];
  let layout;
  for (const stage of stages) {
    layout = compose(stage);
    if (total(layout) <= max) return [header, ...layout.tree, ...layout.logs, ...layout.notes];
  }
  const keptLogs = layout.logs.length > LOG_LINES_AT_CUT + 1 ? layout.logs.slice(0, LOG_LINES_AT_CUT + 1) : layout.logs;
  const notes = [...layout.notes];
  if (keptLogs.length < layout.logs.length) notes.push(`${plural(layout.logs.length - keptLogs.length, "log line")} cut.`);
  const room = Math.max(0, max - 1 - keptLogs.length - notes.length - 1);
  const cut = layout.tree.length - room;
  notes.push(`The span tree is cut: ${cut} of ${plural(layout.tree.length, "line")} not shown.`);
  return [header, ...layout.tree.slice(0, room), ...keptLogs, ...notes].slice(0, max);
};

/** One failed request as a single line, from its stored spans when it has them. */
export const summarize = (traceId, spans, reasons, atMs) => {
  const root = buildTree(spans)[0]?.span;
  const what = root ? `[${root.tier}] ${labelOf(root)}  ${formatMs(root.durationMs)}` : "(no spans stored)";
  return `${new Date(atMs).toISOString().slice(0, 19)}Z  ${traceId}  ${what}  ${[...reasons].join(", ")}`;
};

const FAILED_REQUESTS =
  '{ span.http.response.status_code >= 500 || span.http.status_code >= 500 || span.outcome = "SERVER_ERROR" || (kind = server && status = error) }';

export const run = async ({ argv, env = stackEnv(), fetchImpl = fetch, now = Date.now(), print = console.log }) => {
  const [id, ...rest] = argv;
  if (rest.length > 0 || (id !== undefined && !TRACE_ID.test(id))) {
    print("usage: node scripts/trace.mjs [<traceId>]  (a trace id is 32 hex digits; make trace [ID=<traceId>])");
    return 2;
  }
  const origin = originOf(env, "GRAFANA_PORT");
  const get = async (path, params = {}) => {
    const url = new URL(path, origin);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    return fetchImpl(url, { signal: AbortSignal.timeout(15000) });
  };
  try {
    const health = await get("/api/health");
    if (!health.ok) throw new Error(`status ${health.status}`);
  } catch {
    print(`The observability profile is not running: nothing answered at ${origin}. Start it with \`make observability-up\` (port ${portOf(env, "GRAFANA_PORT")} is this worktree's GRAFANA_PORT).`);
    return 1;
  }
  const tempo = "/api/datasources/proxy/uid/tempo";
  const loki = "/api/datasources/proxy/uid/loki/loki/api/v1/query_range";
  const startNs = (ms) => String(BigInt(Math.floor(ms)) * 1000000n);
  const lokiQuery = async (query, fromMs, toMs, limit, direction = "forward") => {
    const response = await get(loki, { query, start: startNs(fromMs), end: startNs(toMs), limit: String(limit), direction });
    if (!response.ok) throw new Error(`Loki answered ${response.status}`);
    return parseLogs(await response.json());
  };
  const fetchSpans = async (traceId) => {
    const response = await get(`${tempo}/api/v2/traces/${traceId}`);
    if (response.status === 404) return [];
    if (!response.ok) throw new Error(`Tempo answered ${response.status}`);
    return parseTrace(await response.json());
  };

  try {
    if (id) {
      const spans = await fetchSpans(id);
      const { first, last } = extent(spans);
      const from = spans.length > 0 ? first - 60000 : now - RETENTION_MS;
      const to = spans.length > 0 ? last + 3600000 : now;
      const logs = await lokiQuery(`{service=~".+"} |= "${id.toLowerCase()}"`, from, Math.min(to, now), 1000);
      if (spans.length === 0 && logs.length === 0) {
        print(`Nothing is stored for trace ${id}. The store keeps three days, and a request from the last few seconds may not have been exported yet.`);
        return 1;
      }
      for (const line of formatTrace(id.toLowerCase(), spans, logs)) print(line);
      return 0;
    }

    const search = await get(`${tempo}/api/search`, { q: FAILED_REQUESTS, limit: "50", start: String(Math.floor((now - RETENTION_MS) / 1000)), end: String(Math.ceil(now / 1000)) });
    if (!search.ok) throw new Error(`Tempo answered ${search.status}`);
    const failed = new Map();
    const note = (traceId, atMs, reason) => {
      const entry = failed.get(traceId) ?? { atMs: 0, reasons: new Set() };
      entry.atMs = Math.max(entry.atMs, atMs);
      entry.reasons.add(reason);
      failed.set(traceId, entry);
    };
    for (const found of (await search.json()).traces ?? []) note(found.traceID, nanosToMs(found.startTimeUnixNano), "5xx");
    const errors = await lokiQuery('{service=~".+"} |~ "(?i)\\"level\\":\\"error\\""', now - RETENTION_MS, now, 1000, "backward");
    for (const log of errors) if (log.level === "ERROR" && log.traceId && TRACE_ID.test(log.traceId)) note(log.traceId, log.atMs, "ERROR log");
    const recent = [...failed].sort(([, a], [, b]) => b.atMs - a.atMs).slice(0, FAILED_LISTED);
    if (recent.length === 0) {
      print("No failed request is stored: none answered 5xx or logged an ERROR in the last three days.");
      return 0;
    }
    const lines = await Promise.all(recent.map(async ([traceId, { atMs, reasons }]) => summarize(traceId, await fetchSpans(traceId), reasons, atMs)));
    print(`The ${recent.length} most recent failed requests (answered 5xx or logged an ERROR), newest first:`);
    for (const line of lines) print(`  ${line}`);
    print("Read one: make trace ID=<traceId>");
    return 0;
  } catch (error) {
    print(`trace: ${error instanceof Error ? error.message : error}`);
    return 1;
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = await run({ argv: process.argv.slice(2) });
}
