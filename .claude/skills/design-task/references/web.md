# Web design task

The web part of the [`design-task`](../SKILL.md) procedure, read at its
step 4 for a task whose `Scope` is the web app. Each section below is run from
the step of `SKILL.md` that names it; the shared rules there — three
directions in round one, blends only as built directions, stopping only on a
named choice — hold throughout.

## Explore and converge

1. **Build three distinct directions.** Distinct means they differ in a
   structural choice — layout, hierarchy, density, where the weight falls —
   not in a colour swap of one design. For an identity rather than a layout,
   the structural choice is the feel and what colour, type and shape each do
   in it — one action colour or colour as a category key, a quiet face or a
   loud one, soft planes or ruled lines — shown applied to the same real
   screens so only the identity varies. Each direction is a self-contained
   HTML file:
   - carrying real sample data, not lorem ipsum: beers, breweries and feed
     events from the seed or the running app, Finnish strings included
     ([ADR-0011](../../../../docs/adr/0011-i18next-localization.md));
   - working at the phone and desktop widths the iteration agreed (for
     iteration 7.5, the two widths its task 02 records), with a switch in the
     page between them: an Artifact is as wide as the product owner's window,
     so a mockup that relies on media queries is only ever seen at one width.
     Lay the sample screens out with container queries and have the switch
     narrow their container;
   - showing the contrast of every colour pairing it uses, computed from its
     own values, so a direction is never chosen on a palette that fails AA;
   - written outside the repository, in the session's scratchpad. **No
     mockup code is committed**, and a capture taken to look closely stays in
     the scratchpad too, never committed, pushed or uploaded.
2. **Show them.** Publish each direction as a private claude.ai Artifact
   through the `Artifact` tool and give the product owner the links to open
   side by side. If the tool is not in the session — a harness tool may be
   absent, as a plugin may — show the same HTML file in the desktop app's
   browser pane, or say plainly that neither route is available and ask how
   the product owner wants to look at it.
3. **Converge** as `SKILL.md` step 5 says: each round builds what was asked
   for — a refinement of one direction, a new one, two put side by side again.

## Confirm in the real app

Bring the stack up and open the built page in the desktop app's browser pane
at each agreed width. Show the built page next to the chosen mockup and get the
product owner's live sign-off; a difference is fixed and shown again, or
recorded in the ADR as a deliberate departure they agreed to — never left for
a reviewer to notice.

## Evidence

The pull request records what was seen at each agreed width, in words. The
design evidence is behavioural tests of what shipped: skeletons matching the
new layout, `@axe-core/playwright` scans at both agreed widths, and
keyboard-only tests where something became interactive.

## Gates

No lines beyond `SKILL.md`'s: the rounds, the directions per round and the
ADR.
