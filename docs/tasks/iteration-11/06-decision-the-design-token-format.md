# Task 06: Decide the design token format

- **Status:** needs-refinement
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
file is, where it lives, what it models (primitive and semantic layers, the
dark palette if [task 04](04-decision-and-design-dark-mode.md) chose one, type
scale, spacing, motion), how the web's CSS custom properties and the app's theme
are generated from it, and what happens to ADR-0066's checker, which today reads
its layers from `globals.css`. It amends ADR-0073 if shared component contracts
turn out to be needed.

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

## Open questions

- **Functional scope.** An off-the-shelf format and generator, or a small
  generator of our own over a plain TypeScript or JSON source; and whether the
  source models more than colour.
- **Domain and data model.** Whether the semantic layer is identical on both
  platforms or a token may exist on one only; how a platform-specific unit
  (rem against points) is expressed.
- **Module boundaries.** Whether Keycloak's stylesheet is generated from the
  same source, or stays out and is checked against it.
- **Constraints and trade-offs.** Whether ADR-0073 is reopened at all, and the
  signal that would reopen it later.
- **Completion signals.** How a drift between source and generated files fails
  the build.

## Acceptance criteria

- [ ] An ADR records the format, the generators' contract and the alternatives
      rejected, amends ADR-0066 for where the layers are read from, and passes
      `node scripts/check-adrs.mjs`
- [ ] The ADR states whether ADR-0073 stands, and amends it if it does not
- [ ] A throwaway spike generated both outputs from a three-token source and
      the decision cites what it showed — nothing from it is committed
- [ ] Each test the decision implies is named in the acceptance criteria of
      [task 07](07-token-pipeline.md) before that task is refined
- [ ] `make verify-fast` is green

## Notes

Provenance: [iteration 11's plan](../iteration-11.md) ("Decision: the design
token format"). A decision task adds no automated test of its own, as
[iteration 8 task 01](../iteration-8/01-catalog-data-source.md) argued; the
third criterion is its evidence.
