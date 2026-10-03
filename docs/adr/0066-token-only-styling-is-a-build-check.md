# ADR-0066: Styling outside the semantic token layer fails the build, through a dependency-free checker rather than an ESLint rule

- **Status:** accepted
- **Date:** 2026-10-03

## Context

[ADR-0021](0021-design-tokens-ui-primitives.md)'s whole value is one sentence:
a re-theme touches the semantic token layer rather than every component. That
holds only while no component reaches past the semantic layer for a colour or a
typeface, and until now nothing checked that it didn't. The rule was a
convention, held by whoever happened to be editing.

It had held, in roughly forty components across five iterations. That is the
argument for enforcing it rather than against: the convention is followable and
had never been tried by a session in a hurry. Iteration 7.5 changes the token
vocabulary underneath it and then rebuilds six surfaces against the new one, so
a rule that lands first is something those tasks are written under, and one
that lands afterwards finds its violations by failing someone else's pull
request.

A violation of this rule is also silent. A hardcoded `#2b37c9` renders
correctly, passes every unit test and looks right in review; the cost arrives
at the next re-theme, in one component nobody remembers.
[ADR-0039](0039-mechanisms-for-recurring-rule-violations.md) is the standing
answer for a rule that matters and depends on someone remembering it.

## Decision

**`scripts/check-token-styling.mjs` fails the build when a file under
`frontend/` styles itself with a colour or a typeface outside the semantic
token layer, and an exception is a `token-exception: <reason>` comment on or
just above the line it excuses.**

- **What is banned:** hex, `rgb()`, `hsl()` and the other CSS colour functions;
  Tailwind's default-palette utilities (`bg-zinc-100`, `text-white`); arbitrary
  colour and typeface values (`bg-[#fff]`, `font-[Georgia]`); a `font-family`
  set by hand rather than through a semantic font token; and any `var(--…)`
  reference to the primitive layer. Arbitrary *size* values such as
  `max-h-[calc(100dvh-2rem)]`, arbitrary font weights and Radix's own variables
  stay legal.
- **The layers are read from `app/globals.css`, not listed in the checker.** The
  semantic layer is what an `@theme` block declares; the primitive layer is every
  other custom property the file declares. A re-theme therefore changes what is
  checked without touching the script.
- **What is read:** every `.ts`, `.tsx` and `.css` file under `frontend/`,
  `components/ui/` included because that is where a violation would spread
  furthest. Exempt by definition: `app/globals.css`, where values live;
  tests and `e2e/`, which assert on rendered values; the generated API client.
  Keycloak's `login.css` is outside `frontend/` and is a separate origin's
  stylesheet that cannot import the app's tokens at all.
- **An exception is deliberate, visible and states its reason.** The marker
  excuses its own line and the next. A marker with fewer than three words of
  reason fails, and so does one that excuses nothing, so an exception cannot
  outlive the violation it was taken for.
- **It runs everywhere checks run here:** `make check` (so `make verify-fast`,
  the `pre-push` hook and `make verify`), a CI job, and the `PostToolUse`
  edit-time hook
  ([ADR-0046](0046-edit-time-checks-and-one-verify-gate.md)). The checker has
  a fixture self-test, as its siblings do.
- **Not enforced:** radius, elevation and spacing, even where the chosen
  identity tokenises them. A shadow's colour is a colour and is covered.

Where the rule is documented: this ADR holds why, `frontend/README.md` holds
the sentence a developer applies while writing a component, and it keeps the
warning inline because a violation fails silently
([ADR-0020](0020-documentation-roles.md)).

## Alternatives considered

**An ESLint rule.** The frontend's lint config already enforces its layer
boundaries, and a lint rule reports in the editor, which a script cannot.
Rejected because the script matches `scripts/check-comments.mjs`, which polices
a comparable convention, and runs without an `npm install` in the places a
check here runs. The edit hook is where feedback reaches the agents who write
nearly all of this code, so the rule's real advantage buys little. It would
also have needed a CSS plugin to read the `.css` half of the rule.

**Removing Tailwind's default palette from the theme** (`--color-*: initial` in
`@theme`), so a palette utility generates no CSS. Not chosen as the
enforcement, for two reasons: the violation becomes a class that silently does
nothing, which is the same silence this ADR exists to end but moved from "looks
right" to "looks unstyled", and it covers one of the five banned forms, since a
hex literal or a primitive `var()` is untouched by it. It remains available as a
complement.

**A stylelint dependency for the `.css` half.** Rejected as a new dependency
for a handful of files, with no way to read the TSX half of the same rule.

**Leaving it a convention.** The status quo. Rejected for the timing above.

## Consequences

- Good, because the rule five tasks are about to be written under is checked
  from the first edit, and the failure message names the file, the line and the
  way out.
- Good, because an exception is a line in the diff with a reason beside it,
  where a reviewer meets it, rather than a silence.
- Bad, because the checker reads text. A class name assembled by
  concatenation is invisible to it, and so are CSS colour keywords
  (`fill="white"`, `color: red`) and a named colour inside an arbitrary shadow
  value. The banned list is the forms this tree has been seen to use.
- Bad, because it matches shapes rather than parsing them, so a `#bed` anchor or
  an SVG `url(#abc)` reads as a hex colour. The marker is the way out, and none
  is needed in the tree today.
- Bad, because it reports in the edit hook and the build, not as an editor
  squiggle.
- Neutral, because reading `lib/` as well as the component directories found
  three hex literals in `lib/kaliaMark.ts`, which feed `ImageResponse` and
  cannot read a stylesheet. They carry the first exceptions, each stating its
  reason.
- **Revisit trigger:** a violation of a form the checker cannot see reaches
  `dev`, or a second consumer needs the same layer read, at which point a parser
  earns its cost.

## Evidence

Checked 2026-10-03, iteration 7.5 task 05, with Node 24.

`node --test scripts/check-token-styling.test.mjs` was run before
`check-token-styling.mjs` existed and failed on the missing module. The
checker's first run over the real tree failed on `frontend/lib/kaliaMark.ts`
lines 1 to 3, the only violations in it, which the task's own search of
`components/`, `features/` and `app/` had not covered. With the three markers
in place the checker reports OK and all fixtures pass.
