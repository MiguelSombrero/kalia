---
name: design-task
description: Numbered procedure for a `- **Kind:** design` task whose outcome is a visual choice — building alternatives, putting them in front of the product owner, converging, and recording the choice in an ADR before implement-task builds it. Entry point for any design task; invoke before building anything the task could look like.
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

## Shared setup

1. Read the task file and confirm its `- **Status:**` is `refined` and it
   carries `- **Kind:** design`. A task whose outcome is a visual choice but
   has no `Kind` line gets the line added in a refinement pull request, not
   here — `CLAUDE.md` "Refine in one PR, implement in another".
2. Read what binds the choice: the task's `Why` and `Constraints`, the audit
   or problem statement it cites, the ADR that recorded any earlier design
   choice it must sit with, and [`docs/design.md`](../../../docs/design.md),
   where standing design intent lives. A direction that contradicts an
   accepted choice is a new decision, not an option.
3. Branch off up-to-date `dev` and write `.claude/session-checkpoint.md`, both
   exactly as `implement-task` steps 2–3 say. Add a line per round to the
   checkpoint as it happens. Record a textual account of every direction and
   round and any Artifact links until the ADR records the choice.
4. Choose the procedure below from the app named in the task's `Scope`.
   `Kind: design` stays platform-neutral.

## Web design procedure

5. **Round one: build three distinct directions.** Distinct means they differ
   in a structural choice — layout, hierarchy, density, where the weight
   falls — not in a colour swap of one design. For an identity rather than a
   layout, the structural choice is the feel and what colour, type and shape
   each do in it — one action colour or colour as a category key, a quiet face
   or a loud one, soft planes or ruled lines — shown applied to the same real
   screens so only the identity varies.
   - Each direction is a self-contained HTML file:
     - carrying real sample data, not lorem ipsum: beers, breweries and feed
       events from the seed or the running app, Finnish strings included
       ([ADR-0011](../../../docs/adr/0011-i18next-localization.md));
     - working at the phone and desktop widths the iteration agreed (for
       iteration 7.5, the two widths task 02 records), with a switch in the
       page between them: an Artifact is as wide as the product owner's
       window, so a mockup that relies on media queries is only ever seen at
       one width. Lay the sample screens out with container queries and have
       the switch narrow their container;
     - showing the contrast of every colour pairing it uses, computed from its
       own values, so a direction is never chosen on a palette that fails AA;
     - written outside the repository, in the session's scratchpad. **No
       mockup code is committed.**
6. **Show them.** Publish each direction as a private claude.ai Artifact
   through the `Artifact` tool and give the product owner the links to open
   side by side. If the tool is not in the session — a harness tool may be
   absent, as a plugin may — show the same HTML file in the desktop app's
   browser pane, or say plainly that neither route is available and ask how
   the product owner wants to look at it. Do not fall back to describing
   directions in prose: that is what this procedure exists to avoid.
7. **Converge, in as many rounds as the product owner wants.** The product
   owner decides when they are satisfied; the skill sets no cap. Each round
   builds what was asked for — a refinement of one direction, a new one, two
   put side by side again. **A blend is allowed only as a new direction that
   is built and shown**, never assembled after the choice, so the direction
   chosen is always one the product owner actually saw. A direction carried
   into a later round unchanged keeps its Artifact link rather than being
   republished. Note each round in the checkpoint.
8. **Stop when the product owner names the direction.** Do not proceed on an
   inference from a comment. If the reply is ambiguous, ask which one. A
   choice that comes with a change attached ("that one, but …") is not yet a
   direction anyone has seen: build the change, show it as a refinement round,
   and treat it as chosen only when the product owner says so. A change that
   raises a question beyond the visual one — where a mapping lives, how much
   of today's app it reaches — is the product owner's too, asked with the
   trade-offs before building.

## Mobile design procedure

For a mobile design task, also follow
[ADR-0108](../../../docs/adr/0108-a-mobile-direction-is-explored-as-a-mockup-or-native-build-then-signed-off-on-the-owners-phone.md).
The mobile process has two separate prototype phases. **Framed directions come
first; native prototypes are not started until the product owner explicitly
selects which direction or directions to take forward.** A frame cannot prove
native behavior, but native builds cost time and are reserved for candidates
the owner wants to explore on-device.

5. **Phase one — build framed directions.** Round one has three distinct
directions, distinguished by structural choices rather than a colour swap.
Show the app's real screens and real seed data, both locales, and a switch to
the largest text size. Use framed Artifacts for layout, identity and the dark
palette. Do not create a native worktree, start the stack for a native build,
build an app, open a simulator or emulator, or otherwise begin native
prototyping in this phase.
6. **Show and iterate on the framed directions.** Show the frames as
Artifacts, with the same HTML file in the browser pane as the fallback. The
product owner may request as many rounds as they want: refine a direction,
introduce another, or compare alternatives. Each changed or blended direction
must be built and shown before it can be selected. Keep unchanged directions'
Artifact links and record every round in the checkpoint.
7. **Stop at the framed-to-native decision gate.** Once the product owner is
ready to move beyond frames, ask them explicitly which direction or
directions to prototype natively. Do not infer this selection from feedback,
and do not build any candidate natively before receiving it. If they ask for
another frame refinement or comparison, do that and remain in phase one.
If the selection or requested change is ambiguous, ask which direction(s)
they mean. Do not record a final design choice or start the implementation
handoff at this gate: it selects candidates for native exploration, not the
final direction.
8. **Phase two — build native prototypes only for the selected direction(s).**
   - Before the first native build, create a second, disposable git worktree
     cut from up-to-date `dev`, set up by the [`worktree` skill](../worktree/SKILL.md).
     Leave its direction changes uncommitted. Give it its own stack ports and
     use the local stack with phone mode off. A native build, simulator and
     emulator count as heavy work under `CLAUDE.md`'s two-session limit.
   - Implement only the candidates the product owner selected; do not
     prototype the remaining framed options unless the product owner selects
     them in a later round.
   - Show each native round in Device Hub's live iOS Simulator against the
     local stack. Show Android once per task on the emulator, where its
     conventions differ. Never substitute a screenshot for a live native
     round.
   - Iterate for as many rounds as the product owner wants. Each round may
     refine a selected candidate or add another candidate only after the
     product owner asks for it. If a direction changes, build and show that
     native refinement; it is not chosen by inference from a comment.
9. **Get explicit final sign-off.** Stop when the product owner names the
   native direction they choose and signs it off. Final sign-off is on the
   product owner's iPhone in phone mode; haptics are judged only there. If
   the iPhone's seven-day signing lapses, continue rounds in the Simulator
   and wait for a re-sign before sign-off. If they have not named a direction,
   keep converging; do not record a choice or hand off to implementation.

## Record, build and verify

10. **Record the choice in this task's own ADR** — `make next-adr`, then
    [the ADR template](../../../docs/adr/template.md). It holds the directions
    shown, across every round, each described well enough that a reader who
    never saw the mockup or native prototype understands what it was; the one
    chosen; and why each other was rejected. For mobile, record both the
    framed and native rounds and the owner's sign-off. Standing intent — what
    later tasks are held against — goes in
    [`docs/design.md`](../../../docs/design.md), not into this ADR, including
    a meaning row for every semantic token the choice adds
    (`scripts/check-design-tokens.mjs` fails without one). The choice does
    **not** go in the task file: it is the request and is frozen at completion
    ([ADR-0026](../../../docs/adr/0026-task-file-format.md)).
11. **Hand off to `implement-task`**, resuming at its step 4 and running it
    through its step 11 — not its step 12, which opens the pull request and
    comes after step 12 here. Nothing about its gates changes: comment pass,
    doc-sync, `/code-review`, `make verify-fast`, each acceptance criterion
    run and then ticked. Choosing and building remain the same task and pull
    request.
12. **Confirm it in the real app**, as part of `implement-task`'s step 10.
    - For a web task, bring the stack up and open the built page in the
      desktop app's browser pane at each agreed width. A mockup is a claim
      about a design; the real page checks whether it survived contact with
      real components and data. If it did not, that is a finding for the
      product owner, not something to quietly adjust. Show the built page next
      to the chosen mockup and get the owner's live sign-off; a difference is
      fixed and shown again, or recorded in the ADR as a deliberate departure
      they agreed to — never left for a reviewer to notice.
    - For a mobile task, confirm the built direction in the native app and get
      final sign-off on the iPhone in phone mode. Record the owner's VoiceOver
      walk in words; do not attach a recording or screenshot.
    - No screenshot leaves the machine. Any capture taken for close
      inspection stays in the scratchpad and is never committed, pushed or
      uploaded (`CLAUDE.md` and `.claude/rules/no-screenshots.md`).
13. **Open the pull request** (`implement-task`'s step 12) per
    `docs/PULL_REQUEST_TEMPLATE.md`, recording in words what was seen and the
    product owner's sign-off from step 12 — no image.
    - For a web task, the design evidence includes skeletons matching the new
      layout, `@axe-core/playwright` scans at both agreed widths, and
      keyboard-only tests where something became interactive.
    - For a mobile task, component tests find every control by role and
      accessible name and render each changed screen at the largest font scale.
      The product owner's VoiceOver walk on the iPhone is recorded in words
      in the pull request. The mobile task's accessibility criteria still
      define what is checked.

## Gates

The gates report is `implement-task`'s, with two lines added: how many rounds
ran and how many directions were shown in each, and the ADR that records the
choice. For a mobile task, also report which framed directions were selected
for native prototyping, the iOS Simulator and Android checks, the iPhone
sign-off and VoiceOver walk, and the component-test coverage.
