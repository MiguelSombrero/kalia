# Task 05: Make token-only styling a rule the build enforces

- **Status:** needs-refinement
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
- Enforcing anything beyond colour and typeface unless
  [task 03](03-visual-identity.md)'s question 6 says spacing, radius and
  elevation became re-theming concerns too.
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
  second home with a real advantage: it reports in the editor. Choosing between
  the two is question 1.
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
  a credible alternative is rejected. Question 1 suggests one will be.

## Open questions

1. **ESLint rule or `scripts/` checker?** A lint rule reports in the editor,
   understands JSX, and is where the frontend's other structural rules already
   live; a checker is dependency-free, runs in `verify-fast`, and matches
   `check-comments.mjs`, which polices a comparable convention. Doing both is a
   third answer and probably a waste.
2. **What exactly is banned?** Candidates, in widening order: hex and `rgb()`
   literals in `.tsx`; Tailwind's default colour utilities (`bg-zinc-100`,
   `text-white`); arbitrary values (`bg-[#fff]`, `text-[color:var(--x)]`);
   direct references to the primitive layer (`var(--mint-600)`). The last one
   is the rule ADR-0021 actually states and the easiest to violate innocently.
3. **How is an exception granted?** `dialog.tsx` already carries arbitrary
   *size* values (`max-h-[calc(100dvh-2rem)]`) for a good reason, so a blanket
   ban on square brackets is wrong. Whether an exception is a comment, an
   allowlist in the checker, or an ESLint disable with a reason, changes how
   visible it is later — and an exception nobody can see is how the rule dies.
4. **Does it cover the primitives themselves?** `components/ui/` is where a
   semantic token is turned into a class string, so it is the one place that
   legitimately does more colour work than anywhere else — but it is also where
   a violation would spread furthest.
5. **Does it look at CSS as well as TSX?** Today all the styling is in `.tsx`
   plus one stylesheet. If the redesign introduces component CSS, a checker
   that only reads `.tsx` goes quietly blind.

## Acceptance criteria

- [ ] A component that references a colour or typeface outside the semantic
      token layer fails the build, demonstrated by a test that introduces such
      a component and asserts the failure — the check was confirmed to fail
      before it was confirmed to pass
- [ ] The check runs in `make verify` and in CI, and in the `PostToolUse`
      edit-time hook if it is fast enough to belong there
      ([ADR-0046](../../adr/0046-edit-time-checks-and-one-verify-gate.md))
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
