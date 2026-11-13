---
name: design-task
description: Numbered procedure for a `- **Kind:** design` task whose outcome is a visual choice — building alternatives, putting them in front of the product owner, converging, and recording the choice in a design record before implement-task builds it. Entry point for any design task, web or mobile; invoke before building anything the task could look like.
---

# Run a design task

`CLAUDE.md`'s `## Workflow` and
[ADR-0062](../../../docs/adr/0062-a-design-task-is-a-skill-and-a-marker.md)
state every gate below; nothing here changes one. This orders the part
`implement-task` cannot: there the outcome is known and the skill orders the
gates around building it, here the outcome is what is being searched for. Once
the product owner has chosen and the choice is recorded, the build is
`implement-task`'s and this skill hands off to it rather than restating it.

The choice is the product owner's, never the agent's. An agent builds
alternatives and lays out the trade-offs; it does not pick one, and does not
rank them in a way that pre-empts the pick.

How directions are built, shown, confirmed and evidenced differs by app, so
each app's part lives in its own file: [`references/web.md`](references/web.md)
and [`references/mobile.md`](references/mobile.md). This file is the part both
share. Steps 5, 8 and 9 below each name the section of the platform file they
run.

## Procedure

1. Read the task file and confirm its `- **Status:**` is `refined` and it
   carries `- **Kind:** design`. A task whose outcome is a visual choice but
   has no `Kind` line gets the line added in a refinement pull request, not
   here — `CLAUDE.md` "Refine in one PR, implement in another".
2. Read what binds the choice: the task's `Why` and `Constraints`, the audit
   or problem statement it cites, the design record — or, for a choice made
   before 2026-11-13, the ADR — of any earlier design choice it must sit
   with, and [`docs/design.md`](../../../docs/design.md), where standing
   design intent lives. A direction that contradicts an accepted choice is a
   new decision, not an option.
3. Branch off up-to-date `dev` and write `.claude/session-checkpoint.md`, both
   exactly as `implement-task` steps 2–3 say. Add a line per round to the
   checkpoint as it happens. Record a textual account of every direction and
   round and any Artifact links until the design record holds the choice.
4. **Read the platform file for the app the task's `Scope` names, and only
   that one.** `Kind: design` stays platform-neutral, and a `Scope` usually
   names the app by its screens rather than by a path, so read the whole task
   for it — iOS and Android are both the mobile app. If the platform is not
   plain, or the task covers the web app and the mobile app, ask the
   product owner how to run it before building anything: neither file is
   written for a direction shown on both at once.
5. **Explore and converge** — the platform file's `## Explore and converge`,
   in as many rounds as the product owner wants, until they name the
   direction. Whatever the platform:
   - Round one has three distinct directions. Distinct means they differ in a
     structural choice, not in a colour swap of one design; each platform file
     says what that means there.
   - **A blend is allowed only as a new direction that is built and shown**,
     never assembled after the choice, so the direction chosen is always one
     the product owner actually saw. A direction carried into a later round
     unchanged keeps its Artifact link rather than being republished.
   - **Stop only when the product owner names the direction.** Do not proceed
     on an inference from a comment; if the reply is ambiguous, ask which one.
     A choice that comes with a change attached ("that one, but …") is not yet
     a direction anyone has seen: build the change, show it as a refinement
     round, and treat it as chosen only when the product owner says so. A
     change that raises a question beyond the visual one — where a mapping
     lives, how much of today's app it reaches — is the product owner's too,
     asked with the trade-offs before building.
   - Do not fall back to describing directions in prose: that is what this
     procedure exists to avoid.
6. **Record the choice in this task's own design record** —
   `docs/design-records/iteration-N-NN-<slug>.md`, written to
   [its template](../../../docs/design-records/template.md) and added to
   [that directory's README](../../../docs/design-records/README.md). A
   visual choice is not an ADR
   ([ADR-0032](../../../docs/adr/0032-when-a-decision-earns-an-adr.md)'s
   fourth test). It holds the directions shown, across every round and every
   route the platform file used, each described well enough that a reader who
   never saw the mockup or prototype understands what it was; the one chosen
   and the product owner's sign-off — a sign-off that only step 8 can give,
   on the built app, is added to the record then; and why each other was
   rejected. Standing intent — what later tasks are held against — goes in
   [`docs/design.md`](../../../docs/design.md), not into this record,
   including a meaning row for every semantic token the choice adds
   (`scripts/check-design-tokens.mjs` fails without one). The choice does
   **not** go in the task file: it is the request and is frozen at completion
   ([ADR-0026](../../../docs/adr/0026-task-file-format.md)).
   - If the choice also makes an architectural decision — what a read
     returns, a check the build runs, a new dependency — that part is an ADR
     (`make next-adr`, [the ADR template](../../../docs/adr/template.md)) or
     an amendment of the ADR it touches, and the record links it.
   - If the choice changes one recorded as an ADR before 2026-11-13, the
     record names that ADR in `Departs from`, and the ADR gets an `Amended`
     line pointing back.
7. **Hand off to `implement-task`**, resuming at its step 4 and running it
   through its step 11 — not its step 12, which opens the pull request and
   comes after step 8 here. Nothing about its gates changes: comment pass,
   doc-sync, `/code-review`, `make verify-fast`, each acceptance criterion
   run and then ticked. Choosing and building remain the same task and pull
   request.
8. **Confirm it in the real app**, as part of `implement-task`'s step 10 —
   the platform file's `## Confirm in the real app`. A mockup or prototype is
   a claim about a design; the built app checks whether it survived contact
   with real components and data. If it did not, that is a finding for the
   product owner, not something to quietly adjust. No screenshot leaves the
   machine: any capture taken for close inspection stays in the scratchpad
   and is never committed, pushed or uploaded (`CLAUDE.md` and
   `.claude/rules/no-screenshots.md`).
9. **Open the pull request** (`implement-task`'s step 12) per
   `docs/PULL_REQUEST_TEMPLATE.md`, recording in words what was seen and the
   product owner's sign-off from step 8 — no image — and the design evidence
   the platform file's `## Evidence` lists.

## Gates

The gates report is `implement-task`'s, with two lines added: how many rounds
ran and how many directions were shown in each, and the design record that
holds the choice, with any ADR its architectural part needed. The platform file's `## Gates` adds its own lines.
