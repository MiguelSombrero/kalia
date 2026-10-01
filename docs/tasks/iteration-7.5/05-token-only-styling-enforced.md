# Task 05: Make token-only styling a rule the build enforces

- **Status:** refined
- **Iteration:** [7.5](../iteration-7.5.md)
- **Covers:** DW-6

## Why

[ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)'s entire value is one
sentence: "a re-theme now touches the semantic token layer rather than every
component". That holds only while no component reaches past the semantic layer
for a colour or a typeface, and **nothing in the build checks that it doesn't**.
It is a convention held by the discipline of whoever is editing.

So far the discipline has held perfectly. A grep across `components/`,
`features/` and `app/` today finds no Tailwind default-palette utility, no
`bg-white` or `text-gray-*`, and no hex literal outside `app/globals.css` — in
roughly forty components written across five iterations by different sessions.
That is the argument for the rule rather than against it: the convention is
demonstrably followable, it has never been tested by a session in a hurry, and
this iteration is the moment the vocabulary underneath it changes.

The timing is the point. Five tasks after this one rebuild six surfaces against
a token set that does not exist yet. A rule that lands first is something those
tasks are simply written under; a rule that lands afterwards is a retrofit
against six freshly-changed pages, and it will find its violations by failing
someone else's PR. [ADR-0039](../../adr/0039-mechanisms-for-recurring-rule-violations.md)
is the standing answer for a rule that matters and depends on someone
remembering it.

## Scope

A check that fails when a component styles itself with a colour or a typeface
that did not come from the semantic token layer, wired into the places checks
run here: the `PostToolUse` edit-time hook, `make verify`, and CI
([ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md)). Plus the
exceptions it grants, and how an exception is taken deliberately rather than by
silence.

## Non-goals

- Deciding the token vocabulary. That is [task 03](03-visual-identity.md), and
  this task checks against whatever that one produces.
- Fixing violations. There are none today; if the redesign introduces any, they
  belong to the task that introduced them.
- Enforcing anything beyond colour and typeface, even if
  [task 03](03-visual-identity.md)'s chosen direction tokenises radius,
  elevation or spacing. A shadow's colour is a colour and is covered.
- The `cn()` class-merging problem.
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) records it as an
  accepted Bad consequence — `cn()` does not de-duplicate conflicting Tailwind
  classes — and it is a different bug from this one. Worth knowing while
  writing the checker, because a violation can be present and invisible for
  exactly that reason.

## Constraints

- The checkers in `scripts/` are **dependency-free Node** and are run by CI and
  by `make verify-fast`. A check that needs a build, a browser or Docker does
  not belong in that set.
- `eslint.config.mjs` is the frontend's existing boundary enforcer — it already
  states the feature layers and the directions allowed between them
  ([architecture.md §5](../../architecture.md)) — so a lint rule is a credible
  second home with a real advantage: it reports in the editor. It was weighed
  and not chosen (below).
- [ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md): one
  verify gate. A new check joins `make verify` rather than becoming a thing
  someone has to remember to run.
- `app/globals.css` is exempt by definition — it is where values live — and so
  is `keycloak/themes/kalia/login/resources/css/login.css`, which is a separate
  origin's stylesheet that cannot import the app's tokens at all
  ([task 11](11-keycloak-pages-carry-the-identity.md)).
- [ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md): whether this
  earns its own ADR or an amendment to
  [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md) depends on whether
  a credible alternative is rejected — and the ESLint rule was.

Decided with the product owner in refinement, 2026-10-01:

- **A dependency-free `scripts/` checker, not an ESLint rule.** It matches
  `check-comments.mjs`, which polices a comparable convention, and it runs in
  `make verify-fast`, in the `PostToolUse` edit-time hook and in CI. The edit
  hook is where its feedback reaches the agents who write nearly all of this
  code, so the ESLint rule's real advantage, reporting in the editor, buys
  little here.
- **What is banned:** hex, `rgb()` and `hsl()` colour literals; Tailwind's
  default palette utilities (`bg-zinc-100`, `text-white`); arbitrary colour
  and font values (`bg-[#fff]`, `font-[…]`); and any `var(--…)` reference to
  the primitive layer. Arbitrary *size* values such as `dialog.tsx`'s
  `max-h-[calc(100dvh-2rem)]` stay legal.
- **It covers `components/ui/`** as well as features and pages. That is where
  a violation would spread furthest.
- **It reads CSS as well as TSX:** any `.css` file under `frontend/` except
  `app/globals.css`.
- **An exception is an inline marker comment stating its reason**, on or just
  above the line it excuses, so it is visible where an editor meets it. A
  marker with no reason fails.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component that references a colour or typeface outside the semantic
      token layer fails the build, demonstrated by a test that introduces such
      a component and asserts the failure — the check was confirmed to fail
      before it was confirmed to pass
- [ ] The check runs in `make verify-fast`, `make verify`, CI and the
      `PostToolUse` edit-time hook
      ([ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md))
- [ ] Its fixture test covers each banned form, a `.css` file, a file under
      `components/ui/`, a legal arbitrary size value, a marker with a reason
      and a marker without one
- [ ] An ADR, or an amendment to
      [ADR-0021](../../adr/0021-design-tokens-ui-primitives.md), records the
      rule and the rejected ESLint alternative, passing
      `node scripts/check-adrs.mjs`
- [ ] Every existing file passes with no exception granted, or each exception
      granted is visible in the diff and states its reason
- [ ] The rule is documented once, in the home
      [ADR-0020](../../adr/0020-documentation-roles.md) gives it, with a
      one-line pointer from anywhere else that mentions it — and because a
      violation of this rule fails *silently* rather than loudly, the warning
      is kept inline wherever an editor meets it, per `CLAUDE.md`
- [ ] `docs/ci-playbook.md` has an entry for the new red job if recognising the
      failure would cost a reader real time
- [ ] `make verify` is green

## Notes

Lifted from no backlog — proposed on 2026-09-12 while sketching this iteration,
on the grounds that the redesign is worth doing once. The
[quality backlog](../quality-backlog.md)'s SHOULD-20 is adjacent but different:
it is about the Radix version pins having four homes, not about token
discipline.
