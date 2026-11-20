#!/usr/bin/env bash
# Read-only report on pull requests, for the orchestrator's verification step
# (implement-iteration step 8): state, merge state, check counts with the
# failing names, whether the diff touches docs/roadmap.md, and the task file's
# status and unticked criteria as the branch has them.
# usage: pr-report.sh <pr-number>...
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "usage: $0 <pr-number>..." >&2
  exit 2
fi

for n in "$@"; do
  pr=$(gh pr view "$n" --json state,mergeStateStatus,title,files,statusCheckRollup)
  echo "== #$n $(jq -r '.title' <<<"$pr")"
  jq -r '"state: \(.state)   merge state: \(.mergeStateStatus)"' <<<"$pr"
  # A check run's result is its conclusion, a status context's its state; anything
  # finished that is not a pass or a skip counts as failed, so the counts add up.
  jq -r '
    def failed: . != "SUCCESS" and . != "PENDING" and . != "SKIPPED" and . != "NEUTRAL";
    [.statusCheckRollup[] | {name: (.name // .context), result: (if .status == "COMPLETED" or .status == null then (.conclusion // .state // "PENDING") else "PENDING" end)}] as $c
    | "checks: \([$c[] | select(.result == "SUCCESS")] | length) passed, \([$c[] | select(.result | failed)] | length) failed, \([$c[] | select(.result == "PENDING")] | length) pending, \([$c[] | select(.result == "SKIPPED" or .result == "NEUTRAL")] | length) skipped"
    , ($c[] | select(.result | failed) | "  failing: \(.name)")
  ' <<<"$pr"
  if jq -e '.files[] | select(.path == "docs/roadmap.md")' <<<"$pr" >/dev/null; then
    echo "touches docs/roadmap.md: yes"
  else
    echo "touches docs/roadmap.md: no"
  fi
  tasks=$(jq -r '.files[].path | select(test("^docs/tasks/iteration-[0-9.]+/[^/]+\\.md$"))' <<<"$pr")
  if [ -z "$tasks" ]; then
    echo "task file: none in the diff"
  elif git fetch -q origin "pull/$n/head" 2>/dev/null; then
    while IFS= read -r path; do
      text=$(git show "FETCH_HEAD:$path" 2>/dev/null || true)
      echo "task file: $path"
      echo "  status: $(grep -m1 '^- \*\*Status:\*\*' <<<"$text" | sed 's/^- \*\*Status:\*\* //')"
      grep '^- \[ \]' <<<"$text" | sed 's/^/  unticked: /' || true
    done <<<"$tasks"
  else
    echo "task file: could not fetch the branch"
  fi
done
