import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { FAILED_LISTED, MAX_LINES, formatTrace, hexId, parseLogLine, parseLogs, parseTrace, run, scrub, scrubSql } from "./trace.mjs";

const TRACE = "0af7651916cd43dd8448eb211c80319d";
const recorded = JSON.parse(readFileSync(new URL("./fixtures/trace/backend-search.tempo.json", import.meta.url), "utf8"));

const id = (n) => n.toString(16).padStart(16, "0");

/** A span in Tempo's JSON, as `parseTrace` reads it. */
const span = (n, parent, name, startMs, durationMs, attributes = {}, extra = {}) => ({
  spanId: id(n),
  parentSpanId: parent === null ? "" : id(parent),
  name,
  startTimeUnixNano: String(BigInt(1_000_000 + startMs) * 1_000_000n),
  endTimeUnixNano: String(BigInt(1_000_000 + startMs + durationMs) * 1_000_000n),
  attributes: Object.entries(attributes).map(([key, value]) => ({ key, value: { stringValue: String(value) } })),
  ...extra,
});

const tempo = (spans, service = "backend") => ({
  trace: {
    resourceSpans: [{ resource: { attributes: [{ key: "service.name", value: { stringValue: service } }] }, scopeSpans: [{ spans }] }],
  },
});

const parsed = (spans, service) => parseTrace(tempo(spans, service));

const logAt = (offsetMs, level, message, service = "backend") => ({ atMs: 1_000_000 + offsetMs, service, level, message });

/** A request whose handler ran `queries` identical statements, each with a result set. */
const nPlusOne = (queries) => [
  span(1, null, "http get /api/v1/cellar", 0, 900, { status: "200", outcome: "SUCCESS" }),
  ...Array.from({ length: queries }, (_, i) => span(100 + i, 1, "query", 10 + i, 2, { "jdbc.query[0]": "select b.id from beer b where b.id=?" })),
  ...Array.from({ length: queries }, (_, i) => span(500 + i, 1, "result-set", 10 + i, 1)),
];

test("formats a recorded trace into the tree of its spans, the SQL each ran and its log line", () => {
  const spans = parseTrace(recorded);
  const lines = formatTrace(TRACE, spans, [logAt(300, "INFO", "GET /api/v1/beers -> 200 in 304 ms")]);

  assert.match(lines[0], new RegExp(`^Trace ${TRACE}  .*12 spans in backend`));
  assert.match(lines[1], /^\[backend\] http get \/api\/v1\/beers -> 200  /);
  assert.ok(lines.some((line) => /^ {6}\[backend\] SQL select \.\.\. from catalog\.beer b1_0 .*where b1_0\.moderation_status=\?/.test(line)));
  assert.ok(lines.some((line) => /^ {6}\[backend\] result-set {2}/.test(line)));
  assert.match(lines.at(-1), /^\d\d:\d\d:\d\d\.\d{3} INFO  backend  GET \/api\/v1\/beers -> 200 in 304 ms$/);
  assert.ok(lines.length <= MAX_LINES);
});

test("decodes the base64 ids Tempo returns and roots a span whose parent is not stored", () => {
  assert.equal(hexId("Y6ae0WKf3ug="), "63a69ed1629fdee8");
  assert.equal(hexId("0AF7651916CD43DD8448EB211C80319D"), TRACE);
  const [root] = parseTrace(tempo([span(2, 99, "http get /x", 0, 5)]));
  assert.equal(root.parent, id(99));
  assert.deepEqual(formatTrace(TRACE, [root], [])[1], "[backend] http get /x  5.0 ms");
});

test("marks a span failed by its status, its HTTP status or its outcome", () => {
  const spans = parsed([
    span(1, null, "http get /a", 0, 5, { status: "500" }),
    span(2, null, "http get /b", 6, 5, {}, { status: { code: "STATUS_CODE_ERROR" } }),
    span(3, null, "http get /c", 12, 5, { outcome: "SERVER_ERROR" }),
    span(4, null, "http get /d", 18, 5, { status: "404" }),
  ]);
  assert.deepEqual(spans.map((s) => s.failed), [true, true, true, false]);
});

test("folds repeated sibling spans into one counted line when the trace is over the bound", () => {
  const spans = parsed(nPlusOne(80));
  const logs = [logAt(5, "INFO", "request"), logAt(950, "WARN", "slow")];

  const lines = formatTrace(TRACE, spans, logs);

  assert.ok(lines.length <= MAX_LINES);
  assert.ok(lines.some((line) => /^ {2}\[backend\] SQL select b\.id from beer b where b\.id=\?  x 80, /.test(line)), lines.join("\n"));
  assert.ok(lines.some((line) => /^ {2}\[backend\] result-set {2}x 80, /.test(line)));
  assert.ok(lines.some((line) => line.includes("INFO  backend  request")), "the INFO line survives folding");
  assert.equal(lines.some((line) => line.includes("below WARN")), false);
});

test("leaves a trace under the bound unfolded", () => {
  const lines = formatTrace(TRACE, parsed(nPlusOne(5)), []);
  assert.equal(lines.filter((line) => line.includes("SQL select")).length, 5);
  assert.equal(lines.some((line) => /x \d+/.test(line)), false);
});

test("drops log lines below WARN when folding is not enough, and says how many", () => {
  const spans = parsed(nPlusOne(80));
  const logs = [...Array.from({ length: 145 }, (_, i) => logAt(i, "INFO", `step ${i}`)), logAt(500, "WARN", "pool low"), logAt(600, "ERROR", "query failed")];

  const lines = formatTrace(TRACE, spans, logs);

  assert.ok(lines.length <= MAX_LINES);
  assert.ok(lines.some((line) => line.includes("x 80, ")), "still folded");
  assert.ok(lines.some((line) => line.includes("WARN  backend  pool low")));
  assert.ok(lines.some((line) => line.includes("ERROR backend  query failed")));
  assert.equal(lines.some((line) => line.includes("step 3")), false);
  assert.ok(lines.includes("145 log lines below WARN not shown."));
});

test("cuts the tree of a trace with hundreds of distinct spans and says how much it cut", () => {
  const spans = parsed([
    span(1, null, "http get /api/v1/everything", 0, 900),
    ...Array.from({ length: 400 }, (_, i) => span(10 + i, 1, `step number ${i}`, i, 1)),
  ]);
  const logs = [logAt(1, "INFO", "noise"), logAt(2, "WARN", "heads up")];

  const lines = formatTrace(TRACE, spans, logs);

  assert.equal(lines.length, MAX_LINES);
  assert.match(lines[0], /^Trace .*401 spans/);
  assert.ok(lines.some((line) => /^The span tree is cut: \d+ of 401 lines not shown\.$/.test(line)), lines.slice(-3).join("\n"));
  assert.ok(lines.some((line) => line.includes("WARN  backend  heads up")), "the WARN line outlives the cut");
  assert.equal(lines.some((line) => line.includes("noise")), false);
});

test("states which log lines were cut when the logs alone are over the bound", () => {
  const logs = Array.from({ length: 400 }, (_, i) => logAt(i, "ERROR", `failure ${i}`));
  const lines = formatTrace(TRACE, parsed([span(1, null, "http get /x", 0, 5)]), logs);
  assert.ok(lines.length <= MAX_LINES);
  assert.ok(lines.some((line) => /^\d+ log lines cut\.$/.test(line)));
});

test("prints no bound value, token, query string or address the store holds", () => {
  const sql = scrubSql("select * from users where name = 'alice@example.com' and note = 'it''s a secret'");
  assert.equal(sql, "select * from users where name = ? and note = ?");

  const spans = parsed([span(1, null, "http get /api/v1/beers?search=ipa&token=abc", 0, 5, { "jdbc.query[0]": "update t set v = 'hunter2'" })]);
  const stored = (message) => JSON.stringify({ log: { level: "WARN" }, message, traceId: TRACE });
  const logs = parseLogs({
    data: {
      result: [
        {
          stream: { service: "backend" },
          values: [
            ["1000001000000", stored("call to /api/v1/beers?search=ipa failed with Authorization: Bearer abc.def.ghi for bob@example.com")],
            ["1000002000000", stored('refresh failed {"password": "hunter2", "client_secret":"s3"}')],
          ],
        },
      ],
    },
  });
  const text = formatTrace(TRACE, spans, logs).join("\n");

  for (const leaked of ["ipa", "hunter2", "abc.def", "bob@", "s3\"", "token=abc"]) {
    assert.equal(text.includes(leaked), false, `${leaked} leaked:\n${text}`);
  }
  assert.ok(text.includes("/api/v1/beers failed"));
});

test("reads a log line's level and message from either tier's JSON, and from plain text", () => {
  assert.deepEqual(parseLogLine('{"@timestamp":"t","log":{"level":"WARN","logger":"x"},"message":"slow","traceId":"a"}'), { level: "WARN", message: "slow" });
  assert.deepEqual(parseLogLine('{"level":"error","msg":"backend call failed","traceId":"a"}'), { level: "ERROR", message: "backend call failed" });
  assert.deepEqual(parseLogLine('{"level":"info","msg":"Backend call completed","traceId":"a","method":"GET","path":"/api/v1/beers","status":200}'), {
    level: "INFO",
    message: "Backend call completed GET /api/v1/beers -> 200",
  });
  assert.deepEqual(parseLogLine("2026-11-15 12:00:00 WARNING [org.keycloak] slow"), { level: "WARN", message: "2026-11-15 12:00:00 WARNING [org.keycloak] slow" });
  assert.equal(parseLogLine("plain line").level, "INFO");
  assert.equal(scrub("a /b?c=d e"), "a /b e");
});

test("orders the log lines of every service by time, reading each service from its stream", () => {
  const body = {
    data: {
      result: [
        { stream: { service: "web" }, values: [["1000002000000", '{"level":"info","msg":"later","traceId":"' + TRACE + '"}']] },
        { stream: { service: "backend" }, values: [["1000001000000", '{"log":{"level":"WARN"},"message":"earlier","traceId":"' + TRACE + '"}']] },
      ],
    },
  };
  const logs = parseLogs(body);
  assert.deepEqual(logs.map((log) => [log.service, log.level, log.message, log.traceId]), [
    ["backend", "WARN", "earlier", TRACE],
    ["web", "INFO", "later", TRACE],
  ]);
});

const response = (body, status = 200) => ({ ok: status < 400, status, json: async () => body });

/** Grafana's proxy as `run` calls it, answering from the given traces and log lines. */
const grafana = ({ traces = {}, found = [], lines = [], down = false }) => async (url) => {
  if (down) throw new TypeError("fetch failed");
  const { pathname, searchParams } = url;
  if (pathname === "/api/health") return response({ database: "ok" });
  if (pathname.endsWith("/api/search")) return response({ traces: found });
  const trace = /\/api\/v2\/traces\/([0-9a-f]{32})$/.exec(pathname)?.[1];
  if (trace) return traces[trace] ? response(traces[trace]) : response({}, 404);
  if (pathname.endsWith("/query_range")) {
    const query = searchParams.get("query");
    const wanted = /\|= "([0-9a-f]{32})"/.exec(query)?.[1];
    const values = lines.filter((line) => (wanted ? line.includes(wanted) : /"level":"error"/i.test(line))).map((line, i) => [String(BigInt(2_000_000 + i) * 1_000_000n), line]);
    return response({ data: { result: [{ stream: { service: "backend" }, values }] } });
  }
  throw new Error(`unexpected ${pathname}`);
};

const runWith = async (argv, fakes, now = 5_000_000) => {
  const printed = [];
  const code = await run({ argv, env: { GRAFANA_PORT: "3701" }, fetchImpl: fakes, now, print: (line) => printed.push(line) });
  return { code, printed };
};

test("prints the recorded request's tree and its log lines through Grafana's proxy", async () => {
  const line = JSON.stringify({ log: { level: "INFO" }, message: "GET /api/v1/beers -> 200 in 304 ms", traceId: TRACE });
  const { code, printed } = await runWith([TRACE], grafana({ traces: { [TRACE]: recorded }, lines: [line] }));

  assert.equal(code, 0);
  assert.match(printed[0], /^Trace 0af7651916cd43dd8448eb211c80319d/);
  assert.ok(printed.some((entry) => entry.includes("GET /api/v1/beers -> 200 in 304 ms")));
});

test("lists the ten most recent failed requests, newest first, from a store holding more", async () => {
  const ids = Array.from({ length: 14 }, (_, i) => `${"ab".repeat(15)}${(16 + i).toString(16)}`);
  const found = ids.slice(0, 8).map((traceID, i) => ({ traceID, startTimeUnixNano: String(BigInt(1_000 + i) * 1_000_000_000n) }));
  const errors = ids.slice(8).map((traceID, i) => JSON.stringify({ log: { level: "ERROR" }, message: `failed ${i}`, traceId: traceID }));
  const traces = Object.fromEntries(ids.map((traceID) => [traceID, tempo([span(1, null, "http get /api/v1/cellar", 0, 40, { status: "500" })])]));

  const { code, printed } = await runWith([], grafana({ traces, found, lines: errors }));

  assert.equal(code, 0);
  const rows = printed.filter((entry) => entry.startsWith("  "));
  assert.equal(rows.length, FAILED_LISTED);
  assert.match(printed[0], /^The 10 most recent failed requests/);
  const stamps = rows.map((row) => row.slice(2, 22));
  assert.deepEqual(stamps, [...stamps].sort().reverse());
  assert.ok(rows.every((row) => /[0-9a-f]{32}/.test(row) && row.includes("http get /api/v1/cellar")));
  assert.ok(rows.some((row) => row.endsWith("ERROR log")) && rows.some((row) => row.endsWith("5xx")));
  assert.equal(printed.at(-1), "Read one: make trace ID=<traceId>");
});

test("says no request failed when the store holds none", async () => {
  const { code, printed } = await runWith([], grafana({}));
  assert.equal(code, 0);
  assert.match(printed[0], /^No failed request is stored/);
});

test("exits non-zero naming how to start the profile when nothing answers", async () => {
  const { code, printed } = await runWith([TRACE], grafana({ down: true }));
  assert.equal(code, 1);
  assert.match(printed.join("\n"), /not running.*http:\/\/localhost:3701.*`make observability-up`/);
});

test("exits non-zero when the store holds neither spans nor log lines for the id", async () => {
  const { code, printed } = await runWith([TRACE], grafana({}));
  assert.equal(code, 1);
  assert.match(printed[0], /^Nothing is stored for trace /);
});

test("refuses an argument that is not a trace id before it reaches a query", async () => {
  for (const argv of [['x"} |= "y'], ["abc"], [TRACE, "extra"]]) {
    const { code, printed } = await runWith(argv, grafana({ down: true }));
    assert.equal(code, 2);
    assert.match(printed[0], /^usage: /);
  }
});
