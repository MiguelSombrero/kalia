# ADR-0107: One TypeScript token source generates the web's CSS, the app's theme and Keycloak's stylesheet, through a generator of our own rather than Style Dictionary

- **Status:** accepted
- **Date:** 2026-11-07

## Context

Kalia's design tokens live in one place, `web/app/globals.css`: a primitive
layer, a semantic layer, and Tailwind's `@theme` mapping that components
consume ([ADR-0021](0021-design-tokens-ui-primitives.md)). Everything that
polices them reads that file: the token-only styling check
([ADR-0066](0066-token-only-styling-is-a-build-check.md)), the
meaning-row check, the contrast check, and the Keycloak palette check
([ADR-0074](0074-keycloak-pages-one-open-column-under-the-lockup-with-a-palette-drift-check.md)).
The mobile app has no token layer, and a second hand-written set of values for
it is how the platforms drift: a colour corrected on one is wrong on the other
and nothing says so. Keycloak's `login.css` already is a hand-kept copy of
twelve colours with a checker that compares them.

ADR-0021 rejected a TypeScript token pipeline as tooling ahead of its need and
named its own trigger, a second consuming app. The app is that. Iteration 11
must also give the app a dark mode that follows the system, which the web does
not have, so the source must carry two modes, and the web and Keycloak must
render exactly as today from it.

The constraints that bind the answer:

- The repository is plain npm workspaces whose packages ship TypeScript source
  and import from neither app nor from `react-dom`, `next` or `react-native`
  ([ADR-0092](0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)).
- A generated file is committed, read-only to agents and checked for drift, as
  the API client is ([ADR-0012](0012-orval-api-client.md)).
- Keycloak's stylesheet is served from another origin and cannot import
  anything of the app's
  ([ADR-0056](0056-branded-bilingual-keycloak-pages.md)).
- A generator that is a library is a new dependency, whose version is asked
  about rather than researched.
- The web consumes semantic tokens through Tailwind v4's `@theme`.

The product owner decided at refinement, recorded here as made: the format
and its pipeline land before the design tasks, so each writes values into the
source and not into constants converted later; the source models light and
dark from the start; the semantic layer is shared and a token may exist on one
platform only, said explicitly; Keycloak's custom properties are generated from
the same source; drift fails `make check`; and the generator is chosen after a
spike, an off-the-shelf one over DTCG JSON against one of our own over a
TypeScript source.

## Decision

**A single TypeScript module in a new `packages/` package is the only source of
Kalia's design tokens; a dependency-free generator in `scripts/` writes the
web's CSS, the app's theme and Keycloak's token stylesheet from it; each
generated file is committed, read-only to agents and held equal to a fresh
generation by `make check`; and [ADR-0073](0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)
stands, so only tokens are shared.**

**The source** is `packages/tokens/src/tokens.ts`, written as `as const
satisfies` data with no import and no syntax Node cannot run by stripping
types (no `enum`, no `namespace`).

- *What it models.* Primitives (named values); semantic colours, each naming a
  primitive for `light` and for `dark`, both required; dimension families (type
  scale as size, line height and letter spacing; spacing; radius; motion
  durations and easings), which have one value and no mode; and keyed variant
  groups, of which the beer styles are the first. Composite animations such as
  the feed reveal stay in `globals.css`, referencing generated motion tokens.
- *What a token may say about platforms.* Every token reaches the web and the
  app unless it lists its `platforms`; Keycloak is opt-in, because it needs a
  dozen colours and a font, not the vocabulary. A token that exists on one
  platform only says so in its own entry. A token whose material differs by
  platform, which is the font family (the web's comes from `next/font`, the
  app's from a loaded font, Keycloak's is a system stack), carries a value per
  platform under the same rule, rather than three tokens with three names.
- *What stays outside it.* What a token means stays a row in
  [`docs/design.md`](../design.md); the source holds values, not meaning.

**The generator** is `scripts/generate-tokens.mjs`, plain Node that imports
the source directly. It writes three files, each with a header saying it is
generated and each byte-identical on every run:

- *The web:* one stylesheet holding the primitives and semantic colours as
  `:root` custom properties (semantic ones as `var()` references to
  primitives, preserving the two layers) and the `@theme inline` block that
  maps them to Tailwind's namespaces. `globals.css` imports it and keeps its
  hand-written, non-token rules. The web emits the light mode only.
- *The app:* a TypeScript module exporting both modes of the colours and every
  other family as plain numbers and strings.
- *Keycloak:* a stylesheet of the `--kalia-color-*` properties and the font,
  light only, listed in the theme's `styles` ahead of `login.css`, which stops
  declaring colours.

*Units.* The source holds the web's native units (`rem`, `em`, `ms`). The web
receives them as written. The app receives points: `rem` is 16 points, an `em`
letter spacing is that many times the size it spaces, a `px` value passes
through, and a duration is a number of milliseconds. Which modes an output
carries is the generator's per-output setting, so giving the web a dark mode
is a one-line change and not a change to the source.

*Validation.* The generator refuses, with a message naming the token, a
semantic colour missing a mode, an alias to a primitive that does not exist, a
duplicate name and a value of the wrong kind. The package's type check
reports the first two as well; the generator does not rely on it, because
run without the type check a missing mode emitted `undefined` (see Evidence).

**Drift** is `node scripts/generate-tokens.mjs --check`, which regenerates in
memory and fails when a committed file differs, in `make check` with a fixture
self-test, as `scripts/sync-indexes.mjs --check` is. It needs no git and no
install. The three generated paths are denied to agents in
`.claude/settings.json`, as the API client is.

**[ADR-0066](0066-token-only-styling-is-a-build-check.md) is amended** for
where its layers are read from: the semantic layer is the source's semantic
colours and dimension families and the primitive layer is its primitives, not
what `globals.css` declares; the checker, the meaning-row check and the
contrast check import the source instead of parsing CSS, the contrast check
holds both modes' pairings, and the generated files and the source are the
exempt places where values live. Its `mobile/` scope is
[task 07](../tasks/iteration-11/07-token-pipeline.md)'s. The Keycloak palette
check keeps comparing the theme's mark to the app's and rejecting stray colour
literals in `login.css`, and drops the per-colour comparison, which generation
makes true by construction.

**ADR-0073 stands.** Each app keeps its own components; nothing under
`components/ui/` or `mobile/src/components/` moves into a package. **The signal
that reopens it is the same component contract written twice:** a primitive of
the same name and the same variants and states exists in both apps, and a
change to that contract (a variant added, renamed or removed, a state
introduced) has had to be made in both by two separate changes. One such
primitive is a coincidence; the second change to it is the signal, and the
decision then is whether a contract package or a design system would have
absorbed both. Until then the app's primitives are
[task 08](../tasks/iteration-11/08-mobile-ui-primitives.md)'s, written against
the generated theme.

**Tests this decision implies**, for [task 07](../tasks/iteration-11/07-token-pipeline.md)'s
refinement to carry into its acceptance criteria:

1. *Web equivalence.* The generated web custom properties, resolved, equal
   the values `globals.css` declares before the task, token for token, and a
   web build and the Playwright suite are unchanged.
2. *Drift.* `--check` fails when a source value changes without
   regeneration, and when a generated file is edited by hand, and passes on a
   fresh generation; it runs inside `make check`.
3. *Completeness.* A semantic colour with no dark value, an alias to a missing
   primitive, a duplicate name and a wrong-kind value each fail the generator
   with the token's name; the package's type check fails the first two.
4. *Platform scope.* A mobile-only token appears in the theme and in neither
   CSS file; a web-only token the reverse; a token without the Keycloak opt-in
   is absent from Keycloak's file; a per-platform font value reaches each
   output.
5. *Units.* `0.75rem` becomes `12`, an `em` letter spacing becomes points of
   its size, a `px` value and a duration pass through as numbers.
6. *Modes.* The theme carries both modes for every semantic colour; the web
   and Keycloak files carry the light one only.
7. *Determinism.* Two runs are byte-identical.
8. *Tailwind.* A compile of `globals.css` with the generated import yields a
   utility for each semantic colour and each type step the web uses, including
   an opacity modifier on a colour.
9. *The checks read the source.* Adding a semantic token to the source makes
   it a legal token for the styling check with no edit to the script; a
   primitive `var()` still fails; each banned form fails in a `mobile/` file
   and an excusing marker passes; a source token without a meaning row, and a
   row without a token, fail; a failing dark-mode pairing fails the contrast
   check.
10. *Variant groups.* The beer styles generate one block per style on the web
    and a keyed map in the theme, and each still passes the contrast check.
11. *Keycloak.* The theme's `styles` lists the generated file before
    `login.css`; a colour literal added to `login.css` still fails; the
    sign-in page renders in the same colours as before.
12. *Neutrality and read-only.* The package's imports from an app or from
    `react-dom`, `next` or `react-native` fail the neutrality lint, and
    `.claude/settings.json` denies each generated path.

## Alternatives considered

**Style Dictionary over a DTCG-format JSON source.** The off-the-shelf
generator and a standard file format. The spike ran it (see Evidence) and it
works: it validates every alias, including one held in an extension, and fails
loudly on a typo. Rejected because it supplies none of what Kalia's outputs
need. Its stock CSS and JavaScript formats ignored the dark mode and the
platform scope, emitted `@theme`-less CSS, and gave the app `"0.75rem"` as a
string, so two formats, a filter and a transform were written regardless, about
as much code as the whole generator of our own. It also does not know that
every colour needs a dark value; a missing one is whatever the format we write
makes of it. And it adds 106 packages and about 60 MB to the root lockfile,
Dependabot and Trivy, to buy format and target breadth (iOS, Android, Sass)
that Kalia has no use for, and a version the product owner would be asked to
confirm. DTCG's interoperability with design tools is real but no tool reads or
writes Kalia's tokens.

**A DTCG JSON source with a generator of our own.** Keeps the standard file and
the zero dependencies. Rejected because JSON cannot say that an alias must
name a primitive or that both modes must exist; the generator would have to
re-implement at runtime what a TypeScript source gets from the compiler, and
the standard buys nothing while no tool needs it. This is the cheapest
alternative to reverse to (see the revisit trigger).

**Keep `globals.css` as the source and parse it to produce the app's theme.**
No new file, and the web does not move. Rejected: CSS carries no check that a
colour has a dark value, no platform scope and no typed alias, and the source
would be Tailwind's syntax, which a platform-neutral package cannot import.
[ADR-0066](0066-token-only-styling-is-a-build-check.md) already counts
text-matching CSS among its known costs.

**Two hand-written token sets, each checked by its own script.** The status
quo for the app. Rejected: this is the drift the task exists to end, and a
check that compares two hand-kept copies, as the Keycloak one does, is a
generator written in the wrong direction.

**The source inside `web/` or `mobile/`.** No new package. Rejected: the other
app and the generator would import from an app, which
[ADR-0092](0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md)
forbids and its lint rule would fail.

**Generate at build time and commit nothing.** Rejected: Keycloak's theme is
copied into an image as static files, and the API client has already shown that
a committed, drift-checked file lets a reader see the value without running a
build.

**Share component contracts as well as tokens.** The question this task was
opened to answer for
[ADR-0073](0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md).
Rejected for now: the app has no primitives yet, so a shared contract would be
written before a second contract exists to share. The reopening signal above
names what would change that.

## Consequences

- Good, because a value is edited in one place and `make check` fails until
  the three outputs follow, so the colour corrected on one platform cannot
  stay wrong on the other.
- Good, because the missing-dark-mode, misspelt-alias and wrong-platform
  mistakes become failures with a token's name in them, in the edit hook and
  the pre-push gate, instead of a visual difference found later.
- Good, because no dependency is introduced, so no version waits on the
  product owner and nothing new enters the lockfile or the vulnerability scan.
- Good, because Keycloak's colours stop being a hand-kept copy, and the
  checker that compared them has less to do.
- Bad, because Kalia owns a generator: a few hundred lines with its own tests,
  where a library would have been maintained by others. Its three outputs are
  all it will ever write, which is the case for owning it, and also its limit.
- Bad, because the source is TypeScript that Node must run: it is limited to
  syntax Node can strip, the generator needs the Node version in
  `.node-version`, and a tool that is not JavaScript cannot read the tokens
  without running it.
- Bad, because the web's values are no longer in `globals.css`. Finding what
  `--primary` is means opening the source or the generated file, and the
  generated stylesheet is one more thing a reader of the web's CSS follows.
- Bad, because the web carries a dark mode in its source that it does not
  render, which a reader may take for dead data.
- Neutral, because modes exist for colour only. Anything else that must change
  with the mode, a shadow or an image, would need the model extended, and
  [task 04](../tasks/iteration-11/04-decision-and-design-dark-mode.md) or
  [task 03](../tasks/iteration-11/03-design-kalias-identity-on-a-phone.md)
  amends this ADR if it finds one.
- Neutral, because the spike did not run the beer-style groups, the `em`
  conversion, motion tokens or per-platform font values; they are stated here
  and proved by the tests above, not by the spike.
- **Revisit trigger:** a design tool or other non-JavaScript consumer needs to
  read or write the tokens, which makes a DTCG file earn its cost; or task 03
  or 04 finds a value the model cannot express, which amends this ADR first.
  The reopening signal for ADR-0073 is in the Decision.

## Evidence

A throwaway spike, run on 2026-11-07 outside the repository on Node
v26.12.1 (the version `.node-version` names), with Tailwind CSS 4.3.3 from the
repository's lockfile and Style Dictionary 5.8.0, the version the npm registry
listed as `latest` when it ran. Nothing from it is committed. Both sides were
given the same three tokens: a background and a primary colour, each with a
light and a dark value, and a label size of `0.75rem`; plus a `hairline` token
marked for the app only.

*Style Dictionary 5.8.0, DTCG JSON source.*

- `npm install` added 106 packages and a 60 MB `node_modules`.
- With its stock `css` and `js` transform groups, the output had no dark mode,
  carried the app-only token into the web file, flattened the semantic
  tokens to their literal values, and gave `0.75rem` and `1px` to JavaScript
  as strings.
- A dark value held in `$extensions` as an alias is resolved by the library
  (the probe printed the primitive's value), and a misspelt alias, in `$value` or
  in the extension, failed the build with "Some token references (1) could not
  be found".
- Working output needed a custom CSS format, a custom theme format, a platform
  filter and a rem-to-points transform: 55 lines. The result was correct: the
  web file had the light values only and no `hairline`; the theme had both
  modes, `12` for the label and `1` for the hairline. A colour with no dark
  alias fell back to its light value without a message, because that is what
  the format written for it did.

*A generator of our own over a TypeScript source.*

- The source was 19 lines and the generator 33, with no dependency, run as
  `node generate.ts`. It wrote the web stylesheet (`:root` with `var()`
  references and an `@theme inline` block), the theme module with both modes
  and `12` points, and a Keycloak file of two `--kalia-color-*` properties.
  The app-only token was absent from both CSS files.
- Two consecutive runs were byte-identical.
- A `.mjs` file importing the `.ts` source ran under Node with no flag, which is
  how the generator reads it.
- `tsc --strict` rejected a misspelt primitive ("Did you mean
  `"cobalt-300"`?") and a colour missing its dark value, both at the line in
  the source. Run without the type check, the same sources generated a theme
  containing `"primary": undefined`, which is why the generator validates by
  itself.
- Tailwind's compiler, given `@import "tailwindcss"` and an import of the
  generated stylesheet, produced `bg-background`, `text-primary`, `text-label`
  and `bg-primary/50` (with its `color-mix` fallback) from the `@theme inline`
  block of the imported file.
- A first draft emitted `--text-label: var(--text-label)`, a self-reference,
  because a dimension was aliased under its own name. The generator therefore
  writes dimension values into `@theme` directly and aliases only colours,
  which is how `globals.css` is written today.
