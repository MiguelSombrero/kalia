---
name: design-task
description: Numbered procedure for a `- **Kind:** design` task whose outcome is a visual choice — building several directions as mockups, putting them in front of the product owner, converging, and recording the choice in an ADR before implement-task builds it. Entry point for any design task; invoke before building anything a page could look like.
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

## Procedure

1. Read the task file and confirm its `- **Status:**` is `refined` and it
   carries `- **Kind:** design`. A task whose outcome is a visual choice but
   has no `Kind` line gets the line added in a refinement pull request, not
   here — `CLAUDE.md` "Refine in one PR, implement in another".
2. Read what binds the choice: the task's `Why` and `Constraints`, the audit
   or problem statement it cites, the ADR that recorded any earlier design
   choice it must sit with, and [`docs/design.md`](../../../docs/design.md),
   where standing design intent lives. A direction that contradicts an
   accepted choice is a new decision, not a fourth option.
3. Branch off up-to-date `dev` and write `.claude/session-checkpoint.md`, both
   exactly as `implement-task` steps 2–3 say. Add a line per round to the
   checkpoint as it happens — the mockups are not kept, so the checkpoint is
   where each round's directions and their Artifact links are noted until
   step 8 turns them into an ADR.
4. **Round one: build three distinct directions.** Distinct means they differ
   in a structural choice — layout, hierarchy, density, where the weight
   falls — not in a colour swap of one design. For an identity rather than a
   layout, the structural choice is the feel and what colour, type and shape
   each do in it — one action colour or colour as a category key, a quiet face
   or a loud one, soft planes or ruled lines — shown applied to the same
   real screens so only the identity varies. Each is a self-contained HTML
   file:
   - carrying real sample data, not lorem ipsum: beers, breweries and feed
     events from the seed or the running app, Finnish strings included
     ([ADR-0011](../../../docs/adr/0011-i18next-localization.md));
   - working at the phone and desktop widths the iteration agreed (for
     iteration 7.5, the two widths task 02 records), with a switch in the
     page between them: an Artifact is as wide as the product owner's window,
     so a mockup that relies on media queries is only ever seen at one
     width. Lay the sample screens out with container queries and have the
     switch narrow their container;
   - showing the contrast of every colour pairing it uses, computed from its
     own values, so a direction is never chosen on a palette that fails AA;
   - written outside the repository, in the session's scratchpad. **No mockup
     code is committed.**
5. **Show them.** Publish each direction as a private claude.ai Artifact
   through the `Artifact` tool and give the product owner the links to open
   side by side. If the tool is not in the session — a harness tool may be
   absent, as a plugin may — show the same HTML file in the desktop app's
   browser pane, or say plainly that neither route is available and ask how
   the product owner wants to look at it. Do not fall back to describing the
   directions in prose: a description is what this procedure exists to avoid.
6. **Converge, in as many rounds as the product owner wants.** The product
   owner decides when they are satisfied; the skill sets no cap. Each round
   builds what was asked for — a refinement of one direction, a new one, two
   put side by side again. **A blend is allowed only as a new direction that
   is built and shown**, never assembled after the choice, so the direction
   chosen is always one the product owner actually saw. A direction carried
   into a later round unchanged keeps its Artifact link rather than being
   republished. Note each round in the checkpoint.
7. **Stop when the product owner names the direction.** Do not proceed on an
   inference from a comment. If the reply is ambiguous, ask which one. A
   choice that comes with a change attached ("that one, but …") is not yet a
   direction anyone has seen: build the change, show it as a refinement
   round, and treat it as chosen only when the product owner says so. A
   change that raises a question beyond the visual one — where a mapping
   lives, how much of today's app it reaches — is the product owner's too,
   asked with the trade-offs before building.
   Choosing and building are one unbroken run, steps 7 to 11: the direction is
   only in the product owner's eye and the ADR's words until it is built, so
   do not hand the build to a different session. If the session is interrupted
   anyway, the resuming session reads the checkpoint and the ADR, shows the
   product owner the chosen direction again — from its Artifact if it still
   exists, rebuilt from the ADR if not — and builds only after they say that
   is the one they chose.
8. **Record the choice in this task's own ADR** — `make next-adr`, then
   [the ADR template](../../../docs/adr/template.md). It holds the directions
   shown, across every round, each described well enough that a reader who
   never saw the mockup understands what it was; the one chosen; and why each
   other was rejected. Standing intent — what later tasks are held against —
   goes in [`docs/design.md`](../../../docs/design.md), not into this ADR,
   including a meaning row for every semantic token the choice adds
   (`scripts/check-design-tokens.mjs` fails without one). The choice does
   **not** go in the task file: it is the request and is frozen at completion
   ([ADR-0026](../../../docs/adr/0026-task-file-format.md)).
9. **Hand off to `implement-task`**, resuming at its step 4 and running it
   through its step 11 — not its step 12, which opens the pull request and
   comes after step 10 here. Nothing about its gates changes: comment pass,
   doc-sync, `/code-review`, `make verify`, each acceptance criterion run and
   then ticked.
10. **Confirm it in the real app**, as part of `implement-task`'s step 10.
    Bring the stack up, open the built page in the desktop app's browser pane
    and look at it at each agreed width. A mockup is a claim about a design;
    the real page is the check on whether it survived contact with real
    components and data. If it did not, that is a finding for the product
    owner, not something to quietly adjust. **No screenshot leaves the
    machine:** if you take one to look closely, it goes in the scratchpad, and
    it is never committed, pushed or uploaded — `CLAUDE.md` has the rule.
    **Then the product owner signs it off live.** Show them the built page in
    the browser pane at each agreed width, next to the chosen mockup, and ask
    whether it is the direction they chose. Their answer gates the pull
    request: "matches", or what differs. A difference is fixed and shown
    again, or recorded in the ADR as a deliberate departure they agreed to —
    never left for a reviewer to notice.
11. **Open the pull request** (`implement-task`'s step 12) per
    `docs/PULL_REQUEST_TEMPLATE.md`, saying in words what you saw at each
    width and recording the product owner's sign-off from step 10 — no image.
    The criteria a design task carries beyond an ordinary one are that the
    product owner chose from built alternatives, and behavioural tests of what
    shipped — skeletons matching the new layout, `@axe-core/playwright` scans
    at both widths, keyboard-only tests where something became interactive.

## Gates

The gates report is `implement-task`'s, with two lines added: how many rounds
ran and how many directions were shown in each, and the ADR that records the
choice.
