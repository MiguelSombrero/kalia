#!/usr/bin/env node
// Fails when a repository script prints a value read from the environment or
// from a rendered configuration's `environment` map: the local stand-in for
// CodeQL's js/clear-text-logging, which CI runs and `make verify-fast` cannot
// (ADR-0046). A failure names the file and line of the console call, never the
// value.
//
// A sketch of CodeQL's analysis, one file at a time. Taint starts at the
// environment object itself (`process.env` passed, spread or defaulted to a
// parameter, not a direct `process.env.NAME` read, which CodeQL does not count
// either) and at an `.environment` read. It flows through variables (by
// function scope), object fields (by name), local functions' parameters and
// results, `new Error(...)` into every `.message`, and ends at console output
// or process.stdout/stderr.write. An imported function's result is tainted only
// when it is handed the whole environment object, so a flow through another
// module is CodeQL's to find.

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { depthChange, matching, tokenize } from "./js-tokens.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const ENV = "env";
const VALUE = "value";

const STATEMENT_START = new Set(["const", "let", "var", "if", "for", "while", "return", "export", "import", "function", "throw", "try", "class", "switch"]);
const NOT_A_METHOD = new Set(["if", "for", "while", "switch", "catch", "function", "return", "typeof", "await", "new", "super"]);
const LITERAL_WORDS = new Set(["true", "false", "null", "undefined", "this", "super", "async", "await"]);
const UNTAINTING_PREFIX = new Set(["!", "typeof", "void", "delete"]);
const COMPARISON = new Set(["===", "!==", "==", "!=", "<", ">", "<=", ">=", "instanceof", "in"]);
const BOOLEAN_METHODS = new Set(["some", "every", "includes", "startsWith", "endsWith", "test", "has", "hasOwnProperty"]);
const CALLBACK_METHODS = new Set(["map", "flatMap", "forEach", "filter", "find", "findLast"]);
const STRINGIFYING = new Set(["String", "encodeURIComponent", "encodeURI"]);
const STRINGIFYING_MEMBERS = new Set(["JSON.stringify", "Object.values", "Object.entries", "Object.keys"]);
const CONSOLE_METHODS = new Set(["log", "error", "warn", "info", "debug", "trace", "table"]);
const OBJECT_AFTER = new Set(["(", ",", "=", ":", "[", "?", "||", "&&", "??", "...", "return"]);

const strongest = (a, b) => (a === VALUE || b === VALUE ? VALUE : a ?? b);

/**
 * @param {string} source JavaScript source
 * @returns {number[]} the line of each console call that prints a tainted value
 */
export function clearTextLogs(source) {
  const tokens = tokenize(source);
  const is = (k, type, value) => tokens[k]?.type === type && (value === undefined || tokens[k].value === value);
  const punct = (k, value) => is(k, "punct", value);
  const word = (k, value) => is(k, "ident", value);
  const memberName = (k) => punct(k - 1, ".") || punct(k - 1, "?.");

  const exprEnd = (start) => {
    let depth = 0;
    for (let j = start; j < tokens.length; j++) {
      const t = tokens[j];
      if (depth === 0) {
        if (punct(j, ";") || punct(j, ",")) return j;
        if (t.type === "tmpl" && t.closes) return j;
        if (depthChange(t) < 0) return j;
        if (j > start && t.type === "ident" && STATEMENT_START.has(t.value) && t.line > tokens[j - 1].line) return j;
      }
      depth += depthChange(t);
    }
    return tokens.length;
  };

  const opening = (close) => {
    let depth = 0;
    for (let j = close; j >= 0; j--) {
      depth -= depthChange(tokens[j]);
      if (depth === 0) return j;
    }
    return 0;
  };

  /** Splits [start, end) at depth-0 tokens `at` accepts. */
  const split = (start, end, at, keepEmpty = false) => {
    const pieces = [];
    let depth = 0;
    let from = start;
    for (let j = start; j < end; j++) {
      if (depth === 0 && at(j)) {
        pieces.push([from, j]);
        from = j + 1;
      }
      depth += depthChange(tokens[j]);
    }
    pieces.push([from, end]);
    return keepEmpty ? pieces : pieces.filter(([s, e]) => e > s);
  };
  const comma = (j) => punct(j, ",");
  const atDepth0 = (start, end, test) => split(start, end, test, true).length > 1;
  const args = (open) => split(open + 1, matching(tokens, open), comma);
  const withoutSpread = ([s, e]) => [punct(s, "...") ? s + 1 : s, e];

  const substitutionEnd = (chunk) => {
    let depth = 0;
    for (let j = chunk + 1; j < tokens.length; j++) {
      const t = tokens[j];
      if (depth === 0 && t.type === "tmpl" && t.closes) return j;
      depth += depthChange(t);
    }
    return tokens.length;
  };

  /** Token indices of the names a parameter or destructuring pattern in [start, end) binds. */
  const boundNames = (start, end) => {
    const names = [];
    let inDefault = false;
    for (let j = start; j < end; j++) {
      const t = tokens[j];
      if (punct(j, "=")) inDefault = true;
      else if (comma(j) || (depthChange(t) !== 0 && t.type === "punct")) inDefault = false;
      if (inDefault || !is(j, "ident") || memberName(j) || punct(j + 1, ":")) continue;
      if (j === start || [",", "{", "[", "..."].includes(tokens[j - 1].value)) names.push(j);
    }
    return names;
  };

  const scopes = [{ start: 0, end: tokens.length, params: [0, 0] }];
  tokens.forEach((t, k) => {
    if (word(k, "function")) {
      const p = is(k + 1, "ident") ? k + 2 : k + 1;
      if (!punct(p, "(")) return;
      const close = matching(tokens, p);
      if (punct(close + 1, "{")) scopes.push({ start: p, end: matching(tokens, close + 1) + 1, params: [p + 1, close], body: close + 1, name: is(k + 1, "ident") ? tokens[k + 1].value : undefined });
    } else if (punct(k, "=>")) {
      const single = is(k - 1, "ident");
      const start = single ? k - 1 : opening(k - 1);
      const end = punct(k + 1, "{") ? matching(tokens, k + 1) + 1 : exprEnd(k + 1);
      const before = word(start - 1, "async") ? start - 2 : start - 1;
      const name = punct(before, "=") && is(before - 1, "ident") && !memberName(before - 1) ? tokens[before - 1].value : undefined;
      scopes.push({ start, end, params: single ? [start, k] : [start + 1, k - 1], body: k + 1, name });
    } else if (is(k, "ident") && punct(k + 1, "(") && !NOT_A_METHOD.has(t.value) && !memberName(k)) {
      const prev = tokens[k - 1];
      const close = matching(tokens, k + 1);
      const methodish = prev && (["{", "}", ",", ";"].includes(prev.value) || ["async", "static", "get", "set"].includes(prev.value));
      if (methodish && punct(close + 1, "{")) scopes.push({ start: k + 1, end: matching(tokens, close + 1) + 1, params: [k + 2, close], body: close + 1 });
    }
  });
  const scopeAt = new Array(tokens.length + 1).fill(0);
  const order = scopes.map((_, id) => id).sort((a, b) => scopes[b].end - scopes[b].start - (scopes[a].end - scopes[a].start));
  for (const id of order) {
    const scope = scopes[id];
    scope.parent = id === 0 ? -1 : scopeAt[scope.start];
    for (let j = scope.start; j < scope.end; j++) scopeAt[j] = id;
    scope.bindings = new Set();
  }
  for (const scope of scopes) {
    scope.paramNames = split(...scope.params, comma).map(([s, e]) => boundNames(punct(s, "...") ? s + 1 : s, e));
    for (const index of scope.paramNames.flat()) scope.bindings.add(tokens[index].value);
  }
  tokens.forEach((t, k) => {
    if (!(word(k, "const") || word(k, "let") || word(k, "var")) || memberName(k)) return;
    const scope = scopes[scopeAt[k]];
    for (let p = k + 1; p < tokens.length; ) {
      const patternEnd = is(p, "ident") ? p + 1 : matching(tokens, p) + 1;
      for (const index of patternEnd === p + 1 ? [p] : boundNames(p + 1, patternEnd - 1)) scope.bindings.add(tokens[index].value);
      if (!punct(patternEnd, "=")) break;
      const end = exprEnd(patternEnd + 1);
      if (!comma(end)) break;
      p = end + 1;
    }
  });
  const keyOf = (index) => {
    const name = tokens[index].value;
    for (let s = scopeAt[index]; s >= 0; s = scopes[s].parent) if (scopes[s].bindings.has(name)) return `${s}:${name}`;
    return `0:${name}`;
  };

  const functions = new Map();
  scopes.forEach((scope, id) => {
    if (!scope.name) return;
    const close = punct(scope.body, "{") ? matching(tokens, scope.body) : -1;
    const ownReturns = [];
    for (let j = scope.body; j < close; j++) if (word(j, "return") && scopeAt[j] === id) ownReturns.push([j + 1, exprEnd(j + 1)]);
    scope.results = close < 0 ? [[scope.body, exprEnd(scope.body)]] : ownReturns;
    functions.set(scope.name, scope);
  });

  const vars = new Map();
  const fields = new Set();
  const returns = new Map([...functions.keys()].map((name) => [name, null]));
  let changed = false;

  const taintVar = (index, kind) => {
    const key = keyOf(index);
    if (!kind || vars.get(key) === VALUE || vars.get(key) === kind) return;
    vars.set(key, strongest(vars.get(key), kind));
    changed = true;
  };
  const taintField = (name) => {
    if (fields.has(name)) return;
    fields.add(name);
    changed = true;
  };

  const ternary = (start, end) => {
    let depth = 0;
    let nested = 0;
    let question = -1;
    for (let j = start; j < end; j++) {
      if (depth === 0 && punct(j, "?")) {
        if (question < 0) question = j;
        else nested++;
      } else if (depth === 0 && punct(j, ":") && question >= 0) {
        if (nested === 0) return [question, j];
        nested--;
      }
      depth += depthChange(tokens[j]);
    }
    return null;
  };

  const callbackParams = ([s, e]) => {
    if (is(s, "ident") && punct(s + 1, "=>")) return [s];
    if (punct(s, "(")) {
      const close = matching(tokens, s);
      if (punct(close + 1, "=>") && close < e) return boundNames(s + 1, close);
    }
    return [];
  };

  const primary = (k) => {
    const t = tokens[k];
    let kind = null;
    let j = k + 1;
    let path = null;
    if (t.type === "ident") {
      if (t.value === "process" && punct(k + 1, ".") && word(k + 2, "env")) {
        if ((punct(k + 3, ".") || punct(k + 3, "?.")) && is(k + 4, "ident")) return { kind: null, next: k + 5 };
        kind = ENV;
        j = k + 3;
      } else if (t.value === "new") {
        let c = k + 1;
        while (is(c, "ident") && (punct(c + 1, ".") || punct(c + 1, "?."))) c += 2;
        return { kind: null, next: punct(c + 1, "(") ? matching(tokens, c + 1) + 1 : c + 1 };
      } else if (LITERAL_WORDS.has(t.value)) {
        kind = null;
      } else if (punct(k + 1, "(")) {
        const list = args(k + 1).map(withoutSpread);
        if (returns.has(t.value)) kind = returns.get(t.value);
        else if (STRINGIFYING.has(t.value)) kind = list.some((a) => taintOf(...a)) ? VALUE : null;
        else kind = list.some((a) => taintOf(...a) === ENV) ? ENV : null;
        j = matching(tokens, k + 1) + 1;
      } else {
        kind = vars.get(keyOf(k)) ?? null;
        path = t.value;
      }
    } else if (punct(k, "(")) {
      kind = taintOf(k + 1, matching(tokens, k));
      j = matching(tokens, k) + 1;
    } else if (punct(k, "[")) {
      kind = args(k).map(withoutSpread).some((a) => taintOf(...a)) ? VALUE : null;
      j = matching(tokens, k) + 1;
    } else if (punct(k, "{")) {
      const spreads = args(k).filter(([s]) => punct(s, "..."));
      kind = spreads.some(([s, e]) => taintOf(s + 1, e) === ENV) ? ENV : null;
      j = matching(tokens, k) + 1;
    } else if (t.type === "tmpl") {
      let chunk = k;
      while (tokens[chunk]?.opens) {
        const end = substitutionEnd(chunk);
        if (taintOf(chunk + 1, end)) kind = VALUE;
        chunk = end;
      }
      j = chunk + 1;
    }
    while (j < tokens.length) {
      if ((punct(j, ".") || punct(j, "?.")) && is(j + 1, "ident")) {
        const name = tokens[j + 1].value;
        const call = punct(j + 2, "(");
        const member = path ? `${path}.${name}` : null;
        if (call && (BOOLEAN_METHODS.has(name) || (member && STRINGIFYING_MEMBERS.has(member)))) {
          kind = !BOOLEAN_METHODS.has(name) && args(j + 2).map(withoutSpread).some((a) => taintOf(...a)) ? VALUE : null;
          j = matching(tokens, j + 2) + 1;
          path = null;
          continue;
        }
        if (call && kind && CALLBACK_METHODS.has(name)) {
          const [first] = args(j + 2);
          if (first) for (const param of callbackParams(first)) taintVar(param, VALUE);
        }
        if (name === "length") kind = null;
        else if (name === "environment") kind = ENV;
        else if (kind || fields.has(name)) kind = VALUE;
        path = member;
        j += 2;
      } else if (punct(j, "[") || punct(j, "(")) {
        if (punct(j, "[") && kind) kind = VALUE;
        j = matching(tokens, j) + 1;
        path = null;
      } else {
        break;
      }
    }
    return { kind, next: j };
  };

  /** The taint of the expression in [start, end): ENV, VALUE or null. */
  const taintOf = (start, end) => {
    while (start < end && (word(start, "await") || word(start, "async"))) start++;
    if (start >= end) return null;
    if (atDepth0(start, end, (j) => punct(j, "=>"))) return null;
    const branch = ternary(start, end);
    if (branch) return strongest(taintOf(branch[0] + 1, branch[1]), taintOf(branch[1] + 1, end));
    for (const operators of [["||", "??"], ["&&"]]) {
      const pieces = split(start, end, (j) => is(j, "punct") && operators.includes(tokens[j].value));
      if (pieces.length > 1) return pieces.map((p) => taintOf(...p)).reduce(strongest, null);
    }
    if (atDepth0(start, end, (j) => (is(j, "punct") || is(j, "ident")) && COMPARISON.has(tokens[j].value))) return null;
    if ((is(start, "punct") || is(start, "ident")) && UNTAINTING_PREFIX.has(tokens[start].value)) return null;
    let kind = null;
    let chains = 0;
    for (let k = start; k < end; ) {
      const t = tokens[k];
      if (t.type === "punct" && !["(", "[", "{"].includes(t.value)) {
        k++;
        continue;
      }
      const result = primary(k);
      chains++;
      kind = strongest(kind, result.kind);
      k = Math.max(result.next, k + 1);
    }
    return chains > 1 && kind === ENV ? VALUE : kind;
  };

  const bind = (patternStart, patternEnd, kind) => {
    if (!kind) return;
    if (patternEnd - patternStart === 1) taintVar(patternStart, kind);
    else for (const index of boundNames(patternStart + 1, patternEnd - 1)) taintVar(index, VALUE);
  };

  /** `for (const [a, b] of [[x, y], ...])` binds a from the x column only. */
  const bindRows = (patternStart, patternEnd, exprStart, exprEnd_) => {
    const rows = punct(exprStart, "[") && matching(tokens, exprStart) + 1 === exprEnd_ ? args(exprStart) : [];
    if (!punct(patternStart, "[") || rows.length === 0 || !rows.every(([s]) => punct(s, "["))) return false;
    const columns = split(patternStart + 1, patternEnd - 1, comma, true);
    columns.forEach(([s, e], i) => {
      const tainted = rows.some(([r]) => {
        const cell = split(r + 1, matching(tokens, r), comma, true)[i];
        return cell && taintOf(...cell);
      });
      if (tainted) for (const index of e - s === 1 ? [s] : boundNames(s, e)) taintVar(index, VALUE);
    });
    return true;
  };

  const propagate = () => {
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      if ((word(k, "const") || word(k, "let") || word(k, "var")) && !memberName(k)) {
        for (let p = k + 1; p < tokens.length; ) {
          const patternEnd = is(p, "ident") ? p + 1 : matching(tokens, p) + 1;
          if (word(patternEnd, "of") || word(patternEnd, "in")) {
            const close = exprEnd(patternEnd + 1);
            if (!bindRows(p, patternEnd, patternEnd + 1, close)) bind(p, patternEnd, taintOf(patternEnd + 1, close) && VALUE);
            break;
          }
          if (!punct(patternEnd, "=")) break;
          const end = exprEnd(patternEnd + 1);
          bind(p, patternEnd, taintOf(patternEnd + 1, end));
          if (!comma(end)) break;
          p = end + 1;
        }
      } else if (t.type === "ident" && punct(k + 1, "=") && !word(k - 1, "const") && !word(k - 1, "let") && !word(k - 1, "var")) {
        const kind = taintOf(k + 2, exprEnd(k + 2));
        if (memberName(k)) {
          if (kind) taintField(t.value);
        } else {
          taintVar(k, kind);
        }
      } else if (punct(k, "{") && (OBJECT_AFTER.has(tokens[k - 1]?.value) || tokens[k - 1]?.type === "tmpl")) {
        for (const [s, e] of args(k)) {
          if (e - s === 1 && is(s, "ident") && vars.get(keyOf(s))) taintField(tokens[s].value);
          else if ((is(s, "ident") || is(s, "str")) && punct(s + 1, ":") && taintOf(s + 2, e)) taintField(tokens[s].value);
        }
      } else if (t.type === "ident" && !memberName(k) && punct(k + 1, "(") && functions.has(t.value) && !word(k - 1, "function")) {
        const { paramNames } = functions.get(t.value);
        args(k + 1).forEach((arg, i) => {
          const kind = taintOf(...withoutSpread(arg));
          if (!kind || !paramNames[i]) return;
          if (paramNames[i].length === 1) taintVar(paramNames[i][0], kind);
          else for (const index of paramNames[i]) taintVar(index, VALUE);
        });
      } else if (t.type === "ident" && !memberName(k) && punct(k + 1, ".") && ["push", "unshift"].includes(tokens[k + 2]?.value) && punct(k + 3, "(")) {
        if (args(k + 3).some((a) => taintOf(...withoutSpread(a)))) taintVar(k, VALUE);
      } else if (word(k, "new") && is(k + 1, "ident") && /Error$/.test(tokens[k + 1].value) && punct(k + 2, "(")) {
        const [first] = args(k + 2);
        if (first && taintOf(...first)) taintField("message");
      }
    }
    for (const [name, fn] of functions) {
      const kind = fn.results.map((r) => taintOf(...r)).reduce(strongest, null);
      if (kind && returns.get(name) !== kind && returns.get(name) !== VALUE) {
        returns.set(name, strongest(returns.get(name), kind));
        changed = true;
      }
    }
  };

  do {
    changed = false;
    propagate();
  } while (changed);

  const lines = [];
  tokens.forEach((t, k) => {
    let open = -1;
    if (word(k, "console") && punct(k + 1, ".") && CONSOLE_METHODS.has(tokens[k + 2]?.value) && punct(k + 3, "(")) open = k + 3;
    if (word(k, "process") && punct(k + 1, ".") && ["stdout", "stderr"].includes(tokens[k + 2]?.value) && word(k + 4, "write") && punct(k + 5, "(")) {
      open = k + 5;
    }
    if (open >= 0 && args(open).some((a) => taintOf(...withoutSpread(a)))) lines.push(t.line);
  });
  return lines;
}

const main = () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard", "*.mjs", "*.cjs", "*.js"], { cwd: ROOT, encoding: "utf8" }).split("\n").filter(Boolean);
  const problems = files.flatMap((file) =>
    clearTextLogs(readFileSync(resolve(ROOT, file), "utf8")).map((line) => `${file}:${line} prints a value read from the environment or a rendered configuration`),
  );
  console.log(`Checking that ${files.length} scripts print no value read from the environment\n`);
  for (const problem of problems) console.log(`  FAIL  ${problem}`);
  if (problems.length > 0) console.log("\nSay what was found, not the value (CodeQL's js/clear-text-logging fails the same line in CI).");
  console.log(problems.length === 0 ? "\nOK\n" : `\n${problems.length} failure(s)\n`);
  process.exit(problems.length === 0 ? 0 : 1);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
