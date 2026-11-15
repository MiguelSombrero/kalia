#!/usr/bin/env node
// Fails a task-completing PR whose body leaves a gate without a verdict, and any
// PR whose body defers a finding without a backlog ID.
// `implement-task` and ADR-0046 require one per gate and say a gate with no
// verdict counts as skipped, yet about a third of code PRs carried no
// /code-review verdict and none of the last 22 carried the pwd/range lines:
// the report lived in the session's final message and went with it. The
// template's Gates section (docs/PULL_REQUEST_TEMPLATE.md) is where it lives
// now; this reads it.
//
// Only a PR that sets a task file to `done` is checked for all seven gate
// verdicts: that is the PR `implement-task` ends in, and the one whose gates all
// apply. A PR that touches no task file at all (a fix, a process change, an
// agent's commit on a Dependabot PR) is checked for the three that always
// apply (doc-sync, /code-review, make verify-fast), and a PR that ticks every
// criterion of a task while leaving its Status short of `done` fails, because
// a task closes in the PR that implements it (#525 closed by #527, #523 by #533).
// Every PR is checked for a deferred finding with no home: "new task" and
// "follow-up" in a body lived only there until SHOULD-90 found six findings
// from #452 and the ones from #398, #400 and #425 lost, so a body that defers
// must name the quality-backlog entry (MUST-/SHOULD-/COULD-N) it filed in the
// same PR. That is one ID for the body, not one per finding; the reviewer
// checks the rest. Unlike its siblings this needs a PR body, which exists only
// on a pull_request event, so it runs from .github/workflows/pr-body.yml and
// not from `make check`.
//
// usage: check-pr-body.mjs --body-file <path> (--diff-file <path> | --merge-ref) [--author <login>]
//   body: the PR description; diff: a unified diff of docs/tasks carrying whole
//   files as context (`git diff --unified=100000`), or
//   --merge-ref to take it from the checkout, which on a pull_request event
//   is GitHub's merge ref; author: the PR author's login, which exempts a bot
//   whose body quotes third-party text from the deferral rule (THIRD_PARTY_BODY_AUTHORS)

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

// Labels the template's Gates section ships; renaming one there means here.
export const GATE_LABELS = [
  "Range",
  "Doc-sync",
  "Code review",
  "Local gate",
  "Running stack",
  "Acceptance criteria",
  "Iteration Done when",
];

// Repeated until stable: removing one comment can join the text around it
// into another ("<!<!-- x -->--" leaves "<!--"), which a single pass keeps.
function stripComments(text, { keepUnterminated = false } = {}) {
  let previous;
  do {
    previous = text;
    const open = text.indexOf("<!--");
    if (open === -1) break;
    const close = text.indexOf("-->", open + 4);
    if (close === -1 && keepUnterminated) break;
    text = text.slice(0, open) + (close === -1 ? "" : text.slice(close + 3));
  } while (text !== previous);
  return text;
}

// A task file that went to `done` in this diff: an added Status line in a
// docs/tasks/iteration-N/ file. Moving a task's status elsewhere (to
// `refined`, say) is a refinement PR, which carries no gates.
export function completesTask(diff) {
  let inTaskFile = false;
  for (const line of diff.split("\n")) {
    const file = line.match(/^\+\+\+ b\/(.+)$/);
    if (file) {
      inTaskFile = /^docs\/tasks\/iteration-[\d.]+\/[^/]+\.md$/.test(file[1]);
      continue;
    }
    if (inTaskFile && /^\+- \*\*Status:\*\* done\s*$/.test(line)) return true;
  }
  return false;
}

const TASK_FILE = /^docs\/tasks\/iteration-[\d.]+\/[^/]+\.md$/;

// Task files this diff touches, by the `diff --git` header, so a deletion or a
// rename counts as touching one.
export function touchesTaskFile(diff) {
  return diff
    .split("\n")
    .some((line) => {
      const header = line.match(/^diff --git a\/(.+) b\/(.+)$/);
      return header !== null && (TASK_FILE.test(header[1]) || TASK_FILE.test(header[2]));
    });
}

// The new side of each task file in a diff that carries the whole file as
// context (`git diff --unified=<more than the file>`, as mergeRefTasksDiff
// takes it): context and added lines, in order. A deleted file has none.
function newTaskFiles(diff) {
  const files = new Map();
  let current = null;
  let inHunk = false;
  for (const line of diff.split("\n")) {
    const header = line.match(/^diff --git a\/.+ b\/(.+)$/);
    if (header) {
      current = TASK_FILE.test(header[1]) ? { path: header[1], lines: [] } : null;
      if (current) files.set(current.path, current);
      inHunk = false;
    } else if (current && line.startsWith("+++ /dev/null")) {
      files.delete(current.path);
      current = null;
    } else if (current && line.startsWith("@@")) {
      inHunk = true;
    } else if (current && inHunk && (line.startsWith(" ") || line.startsWith("+"))) {
      current.lines.push(line.slice(1));
    }
  }
  return [...files.values()].map(({ path, lines }) => ({ path, text: lines.join("\n") }));
}

const OPEN_STATUSES = ["needs-refinement", "refined", "in-progress"];

// Task files the diff leaves with every acceptance criterion ticked and a
// Status short of `done`: the shape of a task whose implementation merged and
// whose close-out was left for another PR (#525 and #527, #523 and #533).
export function ticksEveryCriterionWithoutDone(diff) {
  const found = [];
  for (const { path, text } of newTaskFiles(diff)) {
    const status = text.match(/^- \*\*Status:\*\* (\S+)\s*$/m)?.[1];
    const section = text.match(/^## Acceptance criteria\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? "";
    const boxes = [...section.matchAll(/^\s*- \[( |x)\]/gm)].map((m) => m[1]);
    if (OPEN_STATUSES.includes(status) && boxes.length > 0 && !boxes.includes(" ")) {
      found.push({ path, status });
    }
  }
  return found;
}

// What this PR changes under docs/tasks, read from the merge ref the checkout
// is on: the diff from its first parent, the base's current tip, to the merge.
// `pull_request.base.sha` is the tip when the PR was opened or last pushed, so
// diffing from it counts every task `dev` finished since as this PR's
// (PRs 513 and 515, SHOULD-117).
export function mergeRefTasksDiff(cwd = ".") {
  const git = (...args) => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const parents = git("rev-list", "--parents", "-n", "1", "HEAD").trim().split(" ");
  if (parents.length !== 3) {
    throw new Error("HEAD is not a merge commit: --merge-ref needs the checkout a pull_request event makes (refs/pull/N/merge)");
  }
  // The whole file as context, so the criteria and the Status line of a task
  // the PR edits are readable even where the edit is far from them.
  return git("diff", "--unified=100000", parents[1], "HEAD", "--", "docs/tasks");
}

// Gate labels whose line is missing, or present with nothing after the label
// once the template's own HTML-comment guidance is stripped.
export function missingVerdicts(body) {
  const lines = stripComments(body).split("\n");
  return GATE_LABELS.filter((label) => {
    const prefix = `- **${label}:**`;
    const line = lines.find((l) => l.trimStart().startsWith(prefix));
    return line === undefined || line.trimStart().slice(prefix.length).trim() === "";
  });
}

const DEFERRAL = /\bnew[ -]tasks?\b|\bfollow[ -]?ups?\b/i;
const NOTHING_DEFERRED = /\b(?:no|zero|without)\s+(?:new[ -]tasks?|follow[ -]?ups?)\b/gi;
const BACKLOG_ID = /\b(?:MUST|SHOULD|COULD)-\d+\b/;

// True when the body defers something (outside the template's own guidance
// comments; an unterminated one hides nothing here) and names no
// quality-backlog ID. "No new task" says nothing was deferred.
export function defersWithoutBacklogId(body) {
  const text = stripComments(body, { keepUnterminated: true }).replace(NOTHING_DEFERRED, "");
  return DEFERRAL.test(text) && !BACKLOG_ID.test(text);
}

// Authors whose PR bodies are not the author's own words. A Dependabot body
// carries the upstream release notes of the dependency it bumps ("move release
// un-draft to a follow-up job", PR 488), which are not review findings and
// have no backlog to be filed in. The login cannot be taken by a person.
export const THIRD_PARTY_BODY_AUTHORS = new Set(["dependabot[bot]"]);

// A PR that touches no task file has no task to say what applies, so these
// always do. The Code review verdict must name /code-review: "reviewed by the
// product owner" stood in for it on #490 and #492, and the product owner does
// not code (CLAUDE.md "Roles").
export const NO_TASK_GATES = [
  { label: "Doc-sync" },
  { label: "Code review", needs: /\/code-review/, hint: "name `/code-review`" },
  { label: "Local gate", needs: /\bmake verify\b/, hint: "name `make verify-fast` (or `make verify`)" },
];
const PRODUCT_OWNER_REVIEW = /\breviewed by the product owner\b/i;

export function noTaskGateProblems(body) {
  const lines = stripComments(body).split("\n");
  const problems = [];
  for (const { label, needs, hint } of NO_TASK_GATES) {
    const prefix = `- **${label}:**`;
    const line = lines.find((l) => l.trimStart().startsWith(prefix));
    const verdict = line === undefined ? "" : line.trimStart().slice(prefix.length).trim();
    if (verdict === "") {
      problems.push(`no task file: no verdict on a line starting "${prefix}" (a PR that touches no task file always records it)`);
    } else if (needs && !needs.test(verdict)) {
      problems.push(`no task file: the "${prefix}" line must ${hint}`);
    } else if (label === "Code review" && PRODUCT_OWNER_REVIEW.test(verdict)) {
      problems.push(`no task file: "reviewed by the product owner" never stands in for \`/code-review\`; run it and record the verdict`);
    }
  }
  return problems;
}

export function checkPrBody({ body, diff, author = "" }) {
  const problems = [];
  if (!THIRD_PARTY_BODY_AUTHORS.has(author) && defersWithoutBacklogId(body)) {
    problems.push(
      'the body defers a finding ("new task" or "follow-up") but names no quality-backlog ID (MUST-/SHOULD-/COULD-N): ' +
        "file it in docs/tasks/quality-backlog.md in this PR and name the ID",
    );
  }
  if (completesTask(diff)) {
    for (const label of missingVerdicts(body)) {
      problems.push(
        `Gates section: no verdict on a line starting "- **${label}:**" (a gate with no verdict counts as skipped)`,
      );
    }
  } else if (!touchesTaskFile(diff) && !THIRD_PARTY_BODY_AUTHORS.has(author)) {
    problems.push(...noTaskGateProblems(body));
  }
  for (const { path, status } of ticksEveryCriterionWithoutDone(diff)) {
    problems.push(
      `${path}: every acceptance criterion is ticked but Status is "${status}", not "done" ` +
        "(a task closes in the PR that implements it: set Status to done there)",
    );
  }
  return problems;
}

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? undefined : process.argv[i + 1];
}

const isMain =
  import.meta.main ??
  (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]));

if (isMain) {
  const bodyFile = arg("--body-file");
  const diffFile = arg("--diff-file");
  const fromMergeRef = process.argv.includes("--merge-ref");
  if (!bodyFile || !diffFile === !fromMergeRef) {
    console.error("usage: check-pr-body.mjs --body-file <path> (--diff-file <path> | --merge-ref) [--author <login>]");
    process.exit(2);
  }
  let diff;
  try {
    diff = fromMergeRef ? mergeRefTasksDiff() : readFileSync(diffFile, "utf8");
  } catch (error) {
    console.error(error.message);
    process.exit(2);
  }
  const problems = checkPrBody({
    body: readFileSync(bodyFile, "utf8"),
    diff,
    author: arg("--author") ?? "",
  });
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    console.error("see docs/PULL_REQUEST_TEMPLATE.md (the Gates section; a deferred finding needs a quality-backlog ID)");
    process.exit(1);
  }
  console.log("PR body: ok");
}
