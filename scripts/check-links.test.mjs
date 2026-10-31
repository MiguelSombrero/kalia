#!/usr/bin/env node
// Fixture self-test for check-links.mjs. The real tree has no broken links,
// so the check never fires on it and would stay green even if it stopped
// looking.

import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";

import { checkLinks, checkRepositoryLinks, resolveTarget } from "./check-links.mjs";

const tree = new Set(["README.md", "docs", "docs/architecture.md", "docs/adr/0001-x.md", "docs/My File.md"]);
const exists = (p) => tree.has(p);

test("passes links that resolve, whatever their fragment, line suffix or encoding", () => {
  const files = {
    "docs/adr/README.md": [
      "[ADR](0001-x.md) [arch](../architecture.md#2-high-level-design) [line](../architecture.md:42)",
      "[root](/README.md) [dir](../../docs) [spaced](../My%20File.md) [angled](<../My File.md>)",
      '[titled](0001-x.md "ADR one") ![image](../architecture.md)',
      "[ref]: ../architecture.md",
    ].join("\n"),
  };
  assert.deepEqual(checkLinks(files, exists), []);
});

test("fails a relative link to no file, naming the file and line", () => {
  const failures = checkLinks({ "docs/tasks/iteration-5.5.md": "Goal\n\n[backlog](tasks/quality-backlog.md)" }, exists);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /^docs\/tasks\/iteration-5\.5\.md:3 /);
  assert.match(failures[0], /docs\/tasks\/tasks\/quality-backlog\.md/);
});

test("fails a broken reference definition", () => {
  assert.equal(checkLinks({ "README.md": "[gone]: docs/gone.md" }, exists).length, 1);
});

test("fails a link that climbs out of the repository", () => {
  assert.equal(checkLinks({ "README.md": "[outside](../elsewhere.md)" }, exists).length, 1);
});

test("ignores URLs, mail addresses and fragments on the same page", () => {
  for (const target of ["https://example.com/x.md", "mailto:a@b.c", "#goals", "vscode://file/x"]) {
    assert.equal(resolveTarget("README.md", target), null, target);
  }
});

test("ignores links inside fenced code blocks and inline code spans", () => {
  const files = {
    "README.md": ["```md", "[example](missing.md)", "```", "~~~", "[tilde](missing.md)", "~~~", "`[span](missing.md)`"].join(
      "\n",
    ),
  };
  assert.deepEqual(checkLinks(files, exists), []);
});

test("ignores a footnote definition, which is not a link", () => {
  assert.deepEqual(checkLinks({ "README.md": "Text.[^1]\n\n[^1]: See ADR-0044 for why." }, exists), []);
});

test("reads a target with balanced parentheses whole", () => {
  const failures = checkLinks({ "README.md": "[draft](docs/foo_(draft).md)" }, exists);
  assert.equal(failures.length, 1);
  assert.match(failures[0], /docs\/foo_\(draft\)\.md/);
});

test("keeps a fence open across a line that opens a nested fence with an info string", () => {
  const files = { "README.md": ["````md", "```js", "[example](missing.md)", "````"].join("\n") };
  assert.deepEqual(checkLinks(files, exists), []);
});

test("checks links again after a fenced code block closes", () => {
  assert.equal(checkLinks({ "README.md": "```\ncode\n```\n[after](missing.md)" }, exists).length, 1);
});

// A hook exports GIT_DIR and friends; a fixture git call that inherits them
// acts on the real repository instead of the temp one.
const { GIT_DIR, GIT_WORK_TREE, GIT_INDEX_FILE, ...cleanEnv } = process.env;

const repository = (files, assertions) => {
  const root = mkdtempSync(resolve(tmpdir(), "links-check-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: root, env: cleanEnv });
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(resolve(root, dirname(rel)), { recursive: true });
      writeFileSync(resolve(root, rel), text);
    }
    execFileSync("git", ["add", "."], { cwd: root, env: cleanEnv });
    assertions(checkRepositoryLinks(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
};

test("scans the Markdown under mobile/ and passes its links that resolve", () => {
  repository(
    {
      "docs/architecture.md": "# Architecture",
      "mobile/README.md": "[shape](../docs/architecture.md#the-mobile-app) [rules](CLAUDE.md)",
      "mobile/CLAUDE.md": "@README.md",
    },
    ({ scanned, failures }) => {
      assert.ok(scanned.includes("mobile/README.md") && scanned.includes("mobile/CLAUDE.md"), scanned.join());
      assert.deepEqual(failures, []);
    },
  );
});

test("fails a broken link in a Markdown file under mobile/, naming the file and line", () => {
  repository(
    { "docs/architecture.md": "# Architecture", "mobile/README.md": "Intro\n\n[gone](../docs/gone.md)" },
    ({ failures }) => {
      assert.equal(failures.length, 1);
      assert.match(failures[0], /^mobile\/README\.md:3 /);
      assert.match(failures[0], /docs\/gone\.md/);
    },
  );
});

test("fails a link to a mobile/ file that does not exist", () => {
  repository({ "README.md": "[the app's rules](mobile/CONVENTIONS.md)" }, ({ failures }) => {
    assert.equal(failures.length, 1);
    assert.match(failures[0], /mobile\/CONVENTIONS\.md/);
  });
});
