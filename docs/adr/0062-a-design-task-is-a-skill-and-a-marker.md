# ADR-0062: A design task has no known outcome, so it runs under a skill and a template marker

- **Status:** accepted
- **Date:** 2026-09-29

## Context

`implement-task` assumes the outcome is known: a `refined` task file says what
to build, and the skill orders the gates around building it. A design task
inverts that. The outcome is the thing being searched for, and the work is to
produce alternatives, put them in front of the product owner, and converge —
"write the code that makes the page look right" is not a step anyone can take.

This has been done here once, by hand.
[ADR-0021](0021-design-tokens-ui-primitives.md)'s Evidence records the passes
the palette took with the product owner, one conversation holding the whole
thing. That is a record of what happened, not a procedure anyone could repeat,
and iteration 7.5 is thirteen tasks across as many sessions, twelve of which
end in a visual choice. An undocumented process run twelve times is twelve
different processes.

Two further gaps meet every one of those tasks on its first step. Kalia has no
place a variant can be shown without being shipped, and the product owner does
not run the code to look at it. And [ADR-0026](0026-task-file-format.md) makes
a task file the frozen *request*, so wherever the chosen design is recorded, it
cannot be the file that asked for it.

## Decision

**A design task runs under a `design-task` skill and is marked by an optional
`- **Kind:** design` line in its task file, which `scripts/check-tasks.mjs`
enforces and `scripts/check-tasks.test.mjs` covers.**

- **The skill** (`.claude/skills/design-task/SKILL.md`) orders the procedure
  from a `refined` design task to the product owner's choice recorded in an
  ADR, then hands off to `implement-task` for the build. Like the other skills
  it orders gates that already exist and changes none of them. It is for any
  task whose outcome is a visual choice, not only this iteration's.
- **The marker** is `Kind`, beside `Status`/`Iteration`/`PR`/`Covers`. `design`
  is its only value; no line means an ordinary task. A `design` task fails the
  checker unless one acceptance criterion mentions built alternatives, so the
  product owner's choice cannot be left out of a design task's definition of
  done. An unknown value fails too.
- **Where a direction is looked at.** Directions are self-contained HTML
  mockups carrying real sample data, Finnish strings included
  ([ADR-0011](0011-i18next-localization.md)), published as private claude.ai
  Artifacts the product owner opens side by side. The skill names a fallback —
  the same HTML file shown in the desktop app's browser pane — because a future
  session may not have the Artifact tool, and a tool that may be absent is not
  a required step, as `CLAUDE.md` already holds of plugins. The chosen
  direction is then confirmed in the real app, in that browser pane, at both
  agreed widths.
- **No screenshot leaves the machine.** None is committed, pushed or uploaded,
  the pull request says in words what was seen at each width, and a capture
  taken to look closely stays in the scratchpad. `CLAUDE.md` carries the rule
  because a capture can show something on the product owner's machine that
  nobody noticed, and a commit cannot be taken back. A prose rule alone is the
  shape [ADR-0039](0039-mechanisms-for-recurring-rule-violations.md) says
  agents break, so `scripts/check-no-raster-images.mjs` backs it: it fails
  `make verify` and CI on any raster image git tracks outside an allowlist of
  directories that starts empty. A task that ships a raster asset adds its
  directory to the allowlist, so the exception is visible in its diff.
- **Prototypes do not survive in the repository.** No mockup code is committed;
  the ADR's description of each direction is the record.
- **Directions and rounds.** Three directions in the first round. Rounds are
  open after that: the product owner decides when they are satisfied and the
  skill sets no cap. A blend of directions is allowed only as a new direction
  that is built and shown, never assembled after the choice, so the direction
  chosen is always one the product owner actually saw.
- **One task both chooses and builds, in one pull request, in one unbroken
  run.** The choice lives only in the product owner's eye and the ADR's words
  until it is built, so the build is not handed to another session. Before the
  pull request opens, the product owner signs off the built page live, in the
  browser pane, against the chosen mockup, and the pull request records that
  sign-off. A session interrupted after the choice resumes from the checkpoint
  and the ADR, and shows the chosen direction again before building.
- **Every design task writes its own ADR:** the directions shown, the one
  chosen, and why each other was rejected. Standing intent — what later tasks
  are held against — goes where
  [task 14](../tasks/iteration-7.5/14-where-design-intent-lives.md) decides, not
  into those ADRs.
- **What "done" means** is the shape iteration 7.5's design tasks already use:
  a criterion that the product owner chose from built alternatives, plus
  behavioural tests of what shipped — skeletons matching the new layout,
  `@axe-core/playwright` scans at both agreed widths, keyboard-only tests
  where something became interactive.
- **The test rule stands.** [ADR-0026](0026-task-file-format.md) requires an
  automated test in every task, and a design task satisfies it with those
  behavioural tests of what it built. Of iteration 7.5's tasks 02–14, only
  [task 12](../tasks/iteration-7.5/12-do-we-need-a-design-system.md) expects to
  take the documented exception for a task that produces no production code
  and therefore no new test, as iteration 7 task 05 and iteration 8 task 01
  did; the rest carry a test criterion of their own, and each is written in its
  own task, not here.

**Not decided here:** any design. The first design decision is
[task 03](../tasks/iteration-7.5/03-visual-identity.md), which is also where
this procedure is proven, and which fixes whatever the skill got wrong in its
own pull request.

## Alternatives considered

**A skill and no marker.** The first recommendation, on the reasoning that the
template holds the request, a design task's request is already expressible in
it, and what was missing was procedure. Rejected by the product owner: with no
marker, a design task can be written without the criterion that the product
owner chose from built alternatives, and "remember to include it" is the
enforcement level this repository has repeatedly found too weak
([ADR-0026](0026-task-file-format.md)'s checker exists for the same reason).

**A marker and no skill.** The checker enforces the criterion, but the
procedure — how many directions, how they reach the product owner, where the
choice is recorded — would be improvised by each session, which is the twelve
different processes the task exists to prevent.

**A sandbox route in the app.** Gives a variant somewhere to live. Rejected:
it ships in the production bundle or needs a build flag to keep it out, the
product owner does not run the code, and a rendered catalogue of what exists
is a separate question
([task 12](../tasks/iteration-7.5/12-do-we-need-a-design-system.md)'s third).

**Committed static HTML mockups.** Rejected: a mockup in the repository becomes
a second, drifting copy of a design the app then implements, against
[ADR-0020](0020-documentation-roles.md)'s one home per fact, and a rejected
direction kept as runnable code is clutter nobody maintains.

**Screenshots only.** Rejected: a screenshot is a picture of one width and
cannot be resized or interacted with, and the phone-width behaviour that most
of these tasks turn on is exactly what it hides.

**Screenshots of the built page in the pull request.** The first version of the
decision, taken in refinement, so a reviewer could see the result without
running it. Rejected by the product owner before this ADR merged: the image is
captured on their machine and published on GitHub, and from the CLI the only
way to attach one is to commit it, so anything visible in the capture becomes
permanent history.

**Choosing and building as separate tasks.** Rejected: it doubles the pull
requests and lets a chosen direction be built by a session that never saw the
alternatives. The built page is also the real check on a choice, so an ADR
describing a chosen direction nobody has built is a decision made on the
mockup's word alone.

## Consequences

- Good, because a design task cannot be written without its "the product owner
  chose from built alternatives" criterion, and the procedure is written once
  rather than reconstructed twelve times.
- Good, because the choice lands where
  [ADR-0020](0020-documentation-roles.md) puts *why*, and the task file stays
  the frozen request.
- Bad, because the mockups are thrown away, so a later reader has only prose
  for the directions that were rejected, and a description of a layout is
  weaker than the layout. The record is deliberately smaller than the
  experience.
- Bad, because a plain-HTML mockup can look right and still fail to survive the
  real components and data. Confirming the chosen direction in the real app is
  the mitigation, and a direction that fails there costs a round after the
  product owner has already chosen.
- Bad, because a reviewer of the pull request cannot see the built page in it.
  The product owner has to look at the running app, or at the private Artifact,
  and the pull request's account of what was seen is text.
- Bad, because the live sign-off needs the product owner present in the session
  when the built page is shown. A design task cannot finish while they are
  away, which is the cost of never publishing an image for them to look at
  later.
- Bad, because showing the mockups depends on the Artifact tool being in the
  session; the browser-pane fallback works but is less convenient for looking at
  three directions side by side.
- Neutral, because the checker verifies a word pair in one criterion, not that
  alternatives were built. That stays a review question, the same limit
  `scripts/check-tasks.mjs` already has for the test criterion.
- Neutral, because the raster check draws its line by directory, not by what a
  file shows: a capture placed in an allowed directory passes, and a screenshot
  renamed to a non-image extension is invisible to it. It stops the accident
  and the careless `git add -f`, not a deliberate evasion, and vector images
  are out of its scope.
- Neutral, because a fifth skill's description costs context in every session
  until it is invoked ([ADR-0035](0035-agent-context-layout.md)).
- Neutral, because `Kind` now exists as a vocabulary with one value; a second
  kind of task would be an amendment to this ADR, not a quiet addition.
- **Revisit trigger:** task 03's pull request finding the procedure wrong in
  more than wording, or a task that is not a visual choice wanting the same
  marker — at which point whether `Kind` is the right vocabulary is worth
  asking again.

## Evidence

- [ADR-0021](0021-design-tokens-ui-primitives.md)'s Evidence lists the passes
  the current palette took: palette comparison → restrained/whitespace pass →
  background-tint comparison → primary-colour assignment → font-pairing
  comparison. It worked in one conversation and is the only prior instance of
  the process.
- **The checker rule was confirmed to fail before it existed.**
  `scripts/check-tasks.test.mjs` was written against `check-tasks.mjs` with the
  rule absent: 3 of its 5 tests failed (a design task with no alternatives
  criterion, one whose "built" and "alternatives" sit in different criteria,
  and an unknown `Kind` value) and the 2 that assert what already held passed
  (an ordinary task with no `Kind`, and a design task that names built
  alternatives). With the rule added all 5 pass, and `node scripts/check-tasks.mjs`
  passes against every existing task file with `Kind: design` on tasks 03, 04,
  06, 07, 08, 09 and 10.
- **The raster check was confirmed to fail before it existed and to block a
  forced add.** `scripts/check-no-raster-images.test.mjs` was written first and
  the suite errored on the missing module; with the checker it has 8 passing
  tests, including a staged-but-uncommitted file, a mixed-case extension, an
  untracked image, a directory that only shares an allowed one's prefix, and a
  run with `GIT_DIR` exported. That last one was added after the first version
  failed under `git push`: the pre-push hook exports `GIT_DIR`, the fixture's
  `git init` inherited it, and it set `core.bare = true` in the real
  repository's shared config, which then broke the hook for every worktree.
  The checker and the fixtures now drop `GIT_DIR`, `GIT_WORK_TREE` and
  `GIT_INDEX_FILE`, and the regression test points `GIT_DIR` at a decoy
  repository so it cannot touch the real one.
  On the real tree, `git add -f` of a `.png` made the checker exit 1 and name
  the file; removed, it exits 0. The repository tracked no raster image when
  the check was added.
