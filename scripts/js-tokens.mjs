// A JavaScript tokenizer for the checkers that read repository scripts
// (check-script-imports, check-clear-text-logging, check-markup-stripping).
// Plain Node, so it runs where `make check` runs without node_modules. It
// knows strings, template literals, regex literals and comments, so a checker
// never mistakes a fixture string or a comment for code; it does not parse.

const PUNCTUATORS = [
  ">>>=", "...", "===", "!==", "**=", "<<=", ">>=", ">>>", "&&=", "||=", "??=",
  "=>", "==", "!=", "<=", ">=", "&&", "||", "??", "?.", "++", "--", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "**", "<<", ">>",
];

// After one of these words a `/` begins a regex literal, not a division.
const REGEX_AFTER_WORD = new Set([
  "return", "typeof", "instanceof", "in", "of", "new", "delete", "void", "throw", "case", "do", "else", "yield", "await",
]);

const IDENT_START = /[A-Za-z_$#\u0080-\uffff]/;
const IDENT_PART = /[\w$\u0080-\uffff]/;
const NUMBER = /^(?:0[xXbBoO][\da-fA-F_]+n?|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?)/;

/**
 * @typedef {{ type: "ident" | "num" | "str" | "tmpl" | "regex" | "punct", value: string, line: number,
 *   opens?: boolean, closes?: boolean, flags?: string }} Token
 * A `tmpl` token is one literal chunk of a template: `opens` when it ends at a
 * `${`, `closes` when it starts after the `}` that ends one. A `regex` token's
 * value is the pattern's source, without slashes or flags.
 */

/**
 * @param {string} source JavaScript source text
 * @returns {Token[]} its tokens, comments dropped
 */
export function tokenize(source) {
  const tokens = [];
  const braces = [];
  let i = source.startsWith("#!") ? source.indexOf("\n") : 0;
  if (i < 0) i = source.length;
  let line = 1 + (source.slice(0, i).match(/\n/g)?.length ?? 0);

  const push = (token) => tokens.push(token);
  const regexAllowed = () => {
    const prev = tokens.at(-1);
    if (!prev) return true;
    if (prev.type === "punct") return ![")", "]", "}", "++", "--"].includes(prev.value);
    if (prev.type === "ident") return REGEX_AFTER_WORD.has(prev.value);
    if (prev.type === "tmpl") return prev.opens === true;
    return false;
  };

  const scanTemplate = (closes) => {
    const startLine = line;
    let value = "";
    while (i < source.length) {
      const c = source[i];
      if (c === "\\") {
        value += source.slice(i, i + 2);
        if (source[i + 1] === "\n") line++;
        i += 2;
      } else if (c === "`") {
        i++;
        push({ type: "tmpl", value, line: startLine, opens: false, closes });
        return;
      } else if (c === "$" && source[i + 1] === "{") {
        i += 2;
        braces.push("template");
        push({ type: "tmpl", value, line: startLine, opens: true, closes });
        return;
      } else {
        if (c === "\n") line++;
        value += c;
        i++;
      }
    }
    push({ type: "tmpl", value, line: startLine, opens: false, closes });
  };

  while (i < source.length) {
    const c = source[i];
    if (c === "\n") {
      line++;
      i++;
    } else if (/\s/.test(c)) {
      i++;
    } else if (c === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") i++;
    } else if (c === "/" && source[i + 1] === "*") {
      const end = source.indexOf("*/", i + 2);
      const stop = end < 0 ? source.length : end + 2;
      line += source.slice(i, stop).match(/\n/g)?.length ?? 0;
      i = stop;
    } else if (c === "'" || c === '"') {
      const startLine = line;
      let j = i + 1;
      while (j < source.length && source[j] !== c && source[j] !== "\n") j += source[j] === "\\" ? 2 : 1;
      push({ type: "str", value: source.slice(i + 1, j), line: startLine });
      i = j + 1;
    } else if (c === "`") {
      i++;
      scanTemplate(false);
    } else if (c === "/" && regexAllowed()) {
      let j = i + 1;
      let inClass = false;
      while (j < source.length && source[j] !== "\n") {
        if (source[j] === "\\") j++;
        else if (source[j] === "[") inClass = true;
        else if (source[j] === "]") inClass = false;
        else if (source[j] === "/" && !inClass) break;
        j++;
      }
      const flags = source.slice(j + 1).match(/^[a-z]*/)[0];
      push({ type: "regex", value: source.slice(i + 1, j), flags, line });
      i = j + 1 + flags.length;
    } else if (IDENT_START.test(c)) {
      let j = i + 1;
      while (j < source.length && IDENT_PART.test(source[j])) j++;
      push({ type: "ident", value: source.slice(i, j), line });
      i = j;
    } else if (/\d/.test(c) || (c === "." && /\d/.test(source[i + 1] ?? ""))) {
      const value = source.slice(i).match(NUMBER)?.[0] || c;
      push({ type: "num", value, line });
      i += value.length;
    } else if (c === "}" && braces.at(-1) === "template") {
      braces.pop();
      i++;
      scanTemplate(true);
    } else {
      const value = PUNCTUATORS.find((p) => source.startsWith(p, i) && !(p === "?." && /\d/.test(source[i + 2] ?? ""))) ?? c;
      if (value === "{") braces.push("brace");
      else if (value === "}") braces.pop();
      push({ type: "punct", value, line });
      i += value.length;
    }
  }
  return tokens;
}

/** How a token changes the bracket depth: `(`, `[`, `{` and an opening template chunk count. */
export const depthChange = (token) => {
  if (token.type === "punct") {
    if (["(", "[", "{"].includes(token.value)) return 1;
    if ([")", "]", "}"].includes(token.value)) return -1;
    return 0;
  }
  if (token.type === "tmpl") return (token.opens ? 1 : 0) - (token.closes ? 1 : 0);
  return 0;
};

/**
 * @param {Token[]} tokens
 * @param {number} open index of an opening bracket or opening template chunk
 * @returns {number} index of the token that closes it, or tokens.length
 */
export function matching(tokens, open) {
  let depth = 0;
  for (let k = open; k < tokens.length; k++) {
    const t = tokens[k];
    if (k > open && t.type === "tmpl" && t.closes && depth === 1) return k;
    depth += depthChange(t);
    if (depth === 0) return k;
  }
  return tokens.length;
}
