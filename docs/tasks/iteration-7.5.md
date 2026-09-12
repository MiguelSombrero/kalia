# Iteration 7.5 — Design sprint

Goal: a visitor meets a Kalia that looks designed rather than defaulted — an
identity and a set of layouts arrived at by prototyping alternatives, not by
restyling what is already there.

## Done when

- **DW-1:** How a design task runs — how directions get prototyped, how they
  reach the product owner, and how the chosen one is recorded — is written
  down, and the tasks in this iteration actually ran that way.
- **DW-2:** Kalia's visual identity is one the product owner picked from
  prototyped alternatives rather than was handed, and `docs/` describes the
  identity that ships rather than iteration 2's.
- **DW-3:** Every surface a visitor can reach renders in that identity, with
  none left in the old one — the front page, the catalog list and a beer's
  details, an own cellar, a public cellar, a profile, sign-up, and Keycloak's
  own login and registration pages.
- **DW-4:** Each Kalia-rendered surface was laid out again rather than
  recoloured, and each is usable at a phone width and at a desktop width,
  verified at both.
- **DW-5:** Every usability problem the opening audit recorded is either fixed
  or carries a written decision not to fix it.
- **DW-6:** A component that hardcodes a colour or a font instead of using a
  semantic token fails the build.
- **DW-7:** The redesigned app passes WCAG 2.1 AA the way it did before the
  redesign, and [ADR-0021](../adr/0021-design-tokens-ui-primitives.md)'s
  contrast evidence describes the palette that actually ships.
- **DW-8:** Whether `components/ui/` becomes a design system is a recorded
  decision rather than an open question.

## Tasks

| ID | Task | Status |
|---|---|---|
| [01](iteration-7.5/01-how-a-design-task-runs.md) | How a design task runs | needs-refinement |
| [02](iteration-7.5/02-design-audit-baseline.md) | The app as it stands, audited | needs-refinement |
| [14](iteration-7.5/14-where-design-intent-lives.md) | Where Kalia's design intent lives | needs-refinement |
| [03](iteration-7.5/03-visual-identity.md) | A new visual identity: colour, type, and the feel they make | needs-refinement |
| [04](iteration-7.5/04-imagery-iconography-and-the-mark.md) | Imagery, iconography and the Kalia mark | needs-refinement |
| [05](iteration-7.5/05-token-only-styling-enforced.md) | Make token-only styling a rule the build enforces | needs-refinement |
| [06](iteration-7.5/06-page-shell.md) | The page shell every page sits in | needs-refinement |
| [07](iteration-7.5/07-front-page-layout.md) | Front page layout | needs-refinement |
| [08](iteration-7.5/08-catalog-layout.md) | Catalog layout | needs-refinement |
| [09](iteration-7.5/09-cellar-layout.md) | Cellar layout | needs-refinement |
| [10](iteration-7.5/10-profile-and-sign-up-layout.md) | Profile and sign-up layout | needs-refinement |
| [11](iteration-7.5/11-keycloak-pages-carry-the-identity.md) | Carry the identity into the Keycloak pages | needs-refinement |
| [12](iteration-7.5/12-do-we-need-a-design-system.md) | Do we need a design system? | needs-refinement |
| [13](iteration-7.5/13-accessibility-and-contrast-reverified.md) | Accessibility and contrast, re-verified across the redesign | needs-refinement |

**Every task here is a prototyping task, and that is what makes this iteration
unusual.** The right palette, the right layout and the right amount of
whitespace are not knowable in advance and are not an agent's to decide. Each
task below therefore ends in a choice the product owner makes between
alternatives that were built and looked at — which is why
[task 01](iteration-7.5/01-how-a-design-task-runs.md) comes first and produces
the mechanism the other twelve use.

Numbered 7.5 rather than 9, for the reason [iteration 5.5](iteration-5.5.md)
and [iteration 6.5](iteration-6.5.md) were: iterations 7 and 8 are already
drafted under `docs/tasks/iteration-7/` and `iteration-8/`, and
`scripts/check-tasks.mjs` accepts one decimal place in an iteration directory
name for exactly this case.

The order in the table is the order of work, and most of it is a constraint
rather than a preference:

- **[01](iteration-7.5/01-how-a-design-task-runs.md) and
  [02](iteration-7.5/02-design-audit-baseline.md) are the opening pair.** The
  first says how the rest are run; the second gives them their problem
  statements, so that four layout tasks do not each re-derive what is wrong
  with the app.
- **[14](iteration-7.5/14-where-design-intent-lives.md) comes before
  [03](iteration-7.5/03-visual-identity.md)** because that task produces a
  statement of what Kalia should feel like and five later tasks are meant to be
  held against it, so it has to know where that statement goes. Its ID is 14
  rather than 03 because it was added after the iteration was seeded and IDs
  are permanent ([the template](template.md)); order of work is the table's
  order, not the ID, as in [iteration 7](iteration-7.md).
- **[03](iteration-7.5/03-visual-identity.md) and
  [04](iteration-7.5/04-imagery-iconography-and-the-mark.md) settle the
  vocabulary** every later task consumes. Nothing below them can be prototyped
  honestly against a palette that is still moving.
- **[05](iteration-7.5/05-token-only-styling-enforced.md) is deliberately
  ahead of the six surfaces it protects.** A rule that lands after the
  redesign is a retrofit against six pages; a rule that lands before it is
  something five tasks are simply written under. It cannot come before
  [03](iteration-7.5/03-visual-identity.md), because the token vocabulary it
  checks is what that task decides.
- **[06](iteration-7.5/06-page-shell.md) precedes the four page tasks**
  because header, footer and container width are what those pages sit inside;
  laying out a page against a shell that is about to change means doing it
  twice.
- **[12](iteration-7.5/12-do-we-need-a-design-system.md) comes last on
  purpose.** The question is worth answering with a real component inventory
  from the redesign in hand — which patterns actually recurred across four
  pages — rather than against the three primitives
  [ADR-0021](../adr/0021-design-tokens-ui-primitives.md) has today, which this
  iteration is about to change. The cost is accepted and named here: the pages
  are built before the system is named, so anything extracted in
  [12](iteration-7.5/12-do-we-need-a-design-system.md) is extracted from code
  that already exists.

Depends on [iteration 6.5](iteration-6.5.md) and [iteration 7](iteration-7.md),
and this is a real dependency rather than a numbering artefact.
[Task 07](iteration-7.5/07-front-page-layout.md) lays out a feed that does not
exist until iteration 7 builds it — the front page today renders a static
welcome — and [task 10](iteration-7.5/10-profile-and-sign-up-layout.md) covers a sign-up
page that iteration 6.5 delivers.
[Iteration 8](iteration-8.md) runs *after* this one and inherits its result:
the catalog-contribution forms it adds are the first UI written under the new
identity rather than converted to it, which is the first honest test of whether
[task 12](iteration-7.5/12-do-we-need-a-design-system.md)'s answer was right.

**Dark mode was considered and deliberately not reopened.**
[ADR-0021](../adr/0021-design-tokens-ui-primitives.md) dropped it as a
decision rather than a deferral — "the palette is a light-mode design … and a
dark variant would be a different design, not a translation of this one" — and
a redesign is the obvious moment to revisit that. The product owner decided on
2026-09-12 that it stays closed for this iteration. It is recorded here rather
than left silent so that the next reader can tell a choice from an oversight,
which is the same reason ADR-0021 wrote it down in the first place.

**UX copy and tone of voice are out of scope**, and that is a boundary worth
stating because every layout task will be tempted across it. Wording a user
reads is bilingual ([ADR-0011](../adr/0011-i18next-localization.md)) and is a
separate kind of work from where things sit on a page. A layout task may move
a string, split one, or add a heading the layout needs; rewriting Kalia's voice
is not this iteration's, and belongs in the [backlog](backlog.md) if the
product owner wants it.

Three things are folded into the tasks that own each surface rather than
carried as tasks of their own, because separating them is how they get skipped:
**responsive behaviour** (every layout task is verified at a phone width and a
desktop width), **loading, error and empty states**
([ADR-0022](../adr/0022-loading-error-empty-states.md)'s skeletons are
shape-matched to the layouts these tasks change, so a skeleton left alone is a
silent regression), and **motion and interaction polish** — hover, press, focus
and transition, including `prefers-reduced-motion`.
