# Task 06: Decide the design token format

- **Status:** done
- **Iteration:** [11](../iteration-11.md)
- **Covers:** DW-2

## Why

Kalia's tokens live in one place, `web/app/globals.css`: a primitive layer, a
semantic layer in an `@theme` block, and a checker that reads both from it
([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md),
[ADR-0066](../../adr/0066-token-only-styling-is-a-build-check.md)). The app has
no such layer, and writing a second set of values for it by hand is how the two
platforms drift apart: a colour corrected on one is wrong on the other, and
nothing says so.

[Iteration 7.5 task 12](../iteration-7.5/12-do-we-need-a-design-system.md)
decided that `components/ui/` stays the web's own primitives, because there was
no second consumer
([ADR-0073](../../adr/0073-components-ui-stays-the-apps-own-primitives-not-a-design-system.md)).
There is one now. Whether it needs shared tokens only, or shared component
contracts as well, is the question this decision reopens ADR-0073 for if the
answer is the second.

## Scope

An ADR records the format of one platform-neutral token source — what the source
file is, where it lives, what it models (primitive and semantic layers, a
light and a dark mode — [task 04](04-decision-and-design-dark-mode.md)
designs the dark values — type scale, spacing, motion), how the web's CSS
custom properties, the app's theme and Keycloak's stylesheet are generated
from it, and what happens to ADR-0066's checker, which today reads its layers
from `globals.css`. It records that ADR-0073 stands for components.

## Non-goals

- Implementing it — [task 07](07-token-pipeline.md).
- The values themselves, which come from tasks [03](03-design-kalias-identity-on-a-phone.md)
  and [04](04-decision-and-design-dark-mode.md).
- A shared component library.

## Constraints

- The repository is plain npm workspaces, with packages that ship TypeScript
  source ([ADR-0092](../../adr/0092-the-repository-is-plain-npm-workspaces-of-web-mobile-and-two-packages-that-ship-typescript-source.md));
  a package imports from neither app, and from none of `react-dom`, `next` or
  `react-native`.
- A generated file is committed read-only and checked for drift, as the API
  client is ([ADR-0012](../../adr/0012-orval-api-client.md)).
- Keycloak's `login.css` is a separate origin's stylesheet that cannot import
  the app's tokens
  ([ADR-0056](../../adr/0056-branded-bilingual-keycloak-pages.md)).
- Any generator is a new dependency: list the candidates and ask for versions
  ([`CLAUDE.md`](../../../CLAUDE.md)).
- Tailwind v4's `@theme` is how the web consumes semantic tokens today
  ([ADR-0021](../../adr/0021-design-tokens-ui-primitives.md)); a decision that
  changes that is a decision about the web.
- `scripts/check-design-tokens.mjs` requires a meaning row in
  [`docs/design.md`](../../design.md) for every semantic token, and
  `scripts/check-contrast.mjs` reads the pairings.

**Decided at refinement, 2026-11-07** (product owner):

- **This decision and its pipeline ([task 07](07-token-pipeline.md)) land
  before the design tasks 02–05,** so each design task writes its values into
  the source rather than into constants that are converted later. The source
  starts with the web's values as they are and the app's provisional ones,
  which [tasks 03](03-design-kalias-identity-on-a-phone.md) and
  [04](04-decision-and-design-dark-mode.md) replace. The format is chosen
  before the identity is known; if task 03 finds something it cannot express,
  task 03 amends this ADR.
- **The source models a light and a dark mode from the start** — the app has
  a dark mode that follows the system
  ([task 04](04-decision-and-design-dark-mode.md)); the web uses the light one.
- **The generator is chosen after the spike.** An off-the-shelf generator
  (Style Dictionary over a DTCG-format JSON source) and a small generator of
  our own over a TypeScript source are each run against a three-token source
  with both modes, and the ADR picks with what the spike showed. A dependency
  is asked about then.
- **The semantic layer is shared;** a token may exist on one platform only,
  and the source says so explicitly. How a platform's unit (rem against
  points) is expressed is the ADR's, shown by the spike.
- **Keycloak's `login.css` custom properties are generated from the same
  source,** committed read-only and drift-checked like the apps' outputs.
- **ADR-0073 stands:** only tokens are shared, and each app keeps its own
  components. The ADR names the signal that would reopen it — the same
  component contract written twice.
- **Drift between the source and a generated file fails `make check`,** as
  the API client's does
  ([ADR-0012](../../adr/0012-orval-api-client.md)).

## Open questions

**None.**

## Acceptance criteria

- [x] An ADR records the format, the generators' contract and the alternatives
      rejected, amends ADR-0066 for where the layers are read from, and passes
      `node scripts/check-adrs.mjs`
- [x] The ADR records that ADR-0073 stands and names the signal that would
      reopen it
- [x] A throwaway spike generated both outputs from a three-token source and
      the decision cites what it showed — nothing from it is committed
- [x] The ADR lists each test the decision implies, for
      [task 07](07-token-pipeline.md)'s refinement to carry into its
      acceptance criteria
- [x] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Decision: the design
token format"). A decision task adds no automated test of its own, as
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md) argued; the
third criterion is its evidence.
