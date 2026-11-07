#!/usr/bin/env node
// What the edge proxy's access log writes for a request line (ADR-0013): no
// query string, and the route template where the path carries a user's name.
// nginx is not installed where `make check` runs, so this reads edge/nginx.conf
// and evaluates its `map` blocks the way nginx does, for the regex and literal
// entries the file uses.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const conf = readFileSync(new URL("../edge/nginx.conf", import.meta.url), "utf8");

/** `{ source, entries }` of the `map <source> <variable>` block that sets `variable`. */
const mapSetting = (variable) => {
  const header = new RegExp(`map\\s+\\$(\\w+)\\s+\\$${variable}\\s*\\{\\n([\\s\\S]*?)\\n\\s*\\}\\n`).exec(conf);
  assert.ok(header, `no map sets $${variable}`);
  const entries = [...header[2].matchAll(/^\s*(~?)(\S+)\s+(\S+?);\s*$/gm)].map(([, regex, key, value]) => ({
    regex: regex === "~",
    key,
    value: value.replace(/^"(.*)"$/, "$1"),
  }));
  return { source: header[1], entries };
};

const maps = { path_without_query: mapSetting("path_without_query"), logged_path: mapSetting("logged_path") };

/** The value of `variable` for a request URI: regex entries in order, then `default`. */
const valueOf = (variable, requestUri) => {
  const values = { request_uri: requestUri };
  const evaluate = (name) => {
    if (name in values) {
      return values[name];
    }
    const { source, entries } = maps[name];
    const input = evaluate(source);
    let result = entries.find((entry) => entry.key === "default")?.value ?? "";
    for (const entry of entries.filter((e) => e.key !== "default")) {
      const match = entry.regex ? new RegExp(entry.key).exec(input) : input === entry.key ? [] : null;
      if (match) {
        result = entry.value;
        for (const [capture, text] of Object.entries(match.groups ?? {})) {
          result = result.replaceAll(`$${capture}`, text);
        }
        break;
      }
    }
    result = result.replace(/\$(\w+)/g, (whole, other) => (other in values || other in maps ? evaluate(other) : whole));
    values[name] = result;
    return result;
  };
  return evaluate(variable);
};

test("the access log writes the route template of a public cellar read, never the user's name", () => {
  assert.equal(valueOf("logged_path", "/api/v1/cellars/jouni"), "/api/v1/cellars/{username}");
  assert.equal(valueOf("logged_path", "/cellars/jouni"), "/cellars/{username}");
});

test("the access log writes the template for a misspelled name and for a query string alike", () => {
  assert.equal(valueOf("logged_path", "/api/v1/cellars/jounii?page=0&token=secret"), "/api/v1/cellars/{username}");
  assert.equal(valueOf("logged_path", "/cellars/jouni?_rsc=1x"), "/cellars/{username}");
});

test("the access log drops the query string from any other path and keeps the path", () => {
  assert.equal(valueOf("logged_path", "/api/v1/beers?query=westvleteren"), "/api/v1/beers");
  assert.equal(valueOf("logged_path", "/api/v1/cellar/bottles"), "/api/v1/cellar/bottles");
  assert.equal(valueOf("logged_path", "/"), "/");
});

test("the access log writes the template for a public cellar read that names a locale too", () => {
  assert.equal(valueOf("logged_path", "/en/cellars/jouni"), "/cellars/{username}");
  assert.equal(valueOf("logged_path", "/fi/cellars/jouni?x=1"), "/cellars/{username}");
});

test("a path that only starts like a cellar read is not rewritten", () => {
  assert.equal(valueOf("logged_path", "/api/v1/cellars"), "/api/v1/cellars");
  assert.equal(valueOf("logged_path", "/api/v1/cellars/jouni/extra"), "/api/v1/cellars/jouni/extra");
});

test("the access log format writes the mapped path and not the request line", () => {
  const format = /log_format\s+edge\s+([^;]*);/.exec(conf);
  assert.ok(format, "no log_format edge");
  assert.match(format[1], /\$logged_path/);
  assert.doesNotMatch(format[1], /\$request\b|\$request_uri|\$uri\b|\$args|\$query_string/);
});
