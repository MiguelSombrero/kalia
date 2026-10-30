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
// Only a PR that sets a task file to `done` is checked for gate verdicts: that
// is the PR `implement-task` ends in, and the one whose gates all apply.
// Every PR is checked for a deferred finding with no home: "new task" and
// "follow-up" in a body lived only there until SHOULD-90 found six findings
// from #452 and the ones from #398, #400 and #425 lost, so a body that defers
// must name the quality-backlog entry (MUST-/SHOULD-/COULD-N) it filed in the
// same PR. That is one ID for the body, not one per finding; the reviewer
// checks the rest. Unlike its siblings this needs a PR body, which exists only
// on a pull_request event, so it runs from .github/workflows/pr-body.yml and
// not from `make check`.
//
// usage: check-pr-body.mjs --body-file <path> --diff-file <path> [--author <login>]
//   body: the PR description; diff: `git diff <base>...HEAD -- docs/tasks`;
//   author: the PR author's login, which exempts a bot whose body quotes
//   third-party text from the deferral rule (THIRD_PARTY_BODY_AUTHORS)

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
  if (!bodyFile || !diffFile) {
    console.error("usage: check-pr-body.mjs --body-file <path> --diff-file <path>");
    process.exit(2);
  }
  const problems = checkPrBody({
    body: readFileSync(bodyFile, "utf8"),
    diff: readFileSync(diffFile, "utf8"),
    author: arg("--author") ?? "",
  });
  if (problems.length > 0) {
    for (const problem of problems) console.error(problem);
    console.error("see docs/PULL_REQUEST_TEMPLATE.md (the Gates section; a deferred finding needs a quality-backlog ID)");
    process.exit(1);
  }
  console.log("PR body: ok");
}
