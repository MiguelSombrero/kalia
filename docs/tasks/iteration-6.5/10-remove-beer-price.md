# Task 10: Remove the beer price property

- **Status:** refined
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

`catalog.beer` carries a `price` (`price_cents` + `currency`, modelled as the
`catalog.domain.Money` value object) and the frontend renders it on the beer
list and the beer details card, locale-formatted. It is a leftover from the
early "sell beer" vision that [ADR-0004](../../adr/0004-backend-cart.md) and
[ADR-0005](../../adr/0005-defer-auth-mock-payments.md) were deprecated for on
2026-08-08.

Price is not a property of a beer or of a bottle: one beer has many prices,
one per shop, and Kalia has no shop integration and no planned "web shop"
functionality. Kalia "never collects beer reviews and does not sell beer"
([CLAUDE.md](../../../CLAUDE.md) project description). A field with no real
meaning invites readers to attach one — the same mistake
[ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)'s amendment was
about, a column with no consumer.

If Kalia ever builds shop or pricing features, they are designed from scratch
at that point, not retrofitted onto a vestigial column.

## Scope

Remove price entirely:

- the `price_cents` / `currency` columns from `catalog.beer` and their seed
  values;
- `catalog.domain.Money` and `catalog.web.MoneyDto`, and the `price` field on
  every catalog DTO and the OpenAPI schema derived from them;
- the regenerated frontend API client, `formatPrice`, and every place the UI
  shows a price (beer list, beer details card) plus the en/fi strings for it;
- every test that asserts on a price or constructs a `Money`.

The public cellar and personal cellar views inherit the change through the
shared beer types; nothing cellar-specific stores a price.

## Non-goals

- Any replacement — no "price range", no per-shop pricing, no external
  catalogue integration. This is a removal.
- Reopening [ADR-0004](../../adr/0004-backend-cart.md) /
  [ADR-0005](../../adr/0005-defer-auth-mock-payments.md); they stay deprecated
  and are not rewritten.
- The [backlog](../backlog.md)'s catalogue-data-source work (iteration 8) —
  where beer data eventually comes from is decided there.

## Constraints

- **No ADR.** Product-owner decision on
  [PR #221](https://github.com/MiguelSombrero/kalia/pull/221): removing a
  vestigial field with no rejected alternative does not earn one
  ([ADR-0032](../../adr/0032-when-a-decision-earns-an-adr.md)).
- Flyway owns the schema; whether this edits the applied `catalog` migrations
  or adds a new one follows
  [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md) and
  [backend/README.md](../../../backend/README.md)'s version-numbering rules —
  settle it in refinement.
- The generated API client is read-only and regenerated, never hand-edited
  ([ADR-0012](../../adr/0012-orval-api-client.md)); the `api-drift` gate must
  stay green.
- `docs/glossary.md`, `docs/architecture.md` §3 (the data model sketch names
  `price_cents, currency` and "Prices are integer cents to avoid floating
  point") and any ADR mentioning price are updated in the same PR
  ([ADR-0020](../../adr/0020-documentation-roles.md)). The same sweep fixes
  the two places that wrongly list price as a *built search filter* —
  `docs/architecture.md` §1 "Functional requirements" and `README.md`'s "What
  Kalia does" list (quality backlog MUST-7, retired into this task); the API
  has never had a price parameter.
- `formatPrice` exists partly as [ADR-0011](../../adr/0011-i18next-localization.md)'s
  worked example of locale-aware number formatting; removing it must not leave
  that ADR referencing a helper that no longer exists.

## Open questions

**None.**

Resolved during refinement (2026-09-05):

- **Domain/data model:** decided — edit `V003__catalog_schema.sql` and
  `V004__catalog_seed_data.sql` in place, per
  [ADR-0036](../../adr/0036-pre-deployment-migration-edits.md)'s amendment
  (routine now for any pre-deployment schema change, not just rejected
  designs; a local volume wipe is already ordinary here).
- **Interaction/UX:** decided — the layout just closes up; no freed-space
  replacement.
- **Terminology:** decided — `Money` and the price-related glossary terms
  move to `docs/glossary.md`'s existing "Terms weighed and dropped" section,
  as a removed concept distinct from the rejected-rename entries there.
- **Localization:** confirmed as an acceptance-criterion action, not a
  decision — the en/fi `common.json` price keys are removed as part of this
  task's implementation.
- **Completion signal:** confirmed — "no occurrence of price / Money / cents
  / currency outside unrelated code, and `docs/architecture.md` §3 no longer
  mentions prices" is the bar; no separate UI sign-off requested.

## Acceptance criteria

- [ ] `catalog.beer` has no price/currency column and the seed data sets none;
      a fresh `docker compose up` (no `-v`) starts and the catalog loads
- [ ] `Money`, `MoneyDto` and every `price` field are gone from the backend;
      `mvn verify` passes, including the OpenAPI documentation IT with no
      price in the schema
- [ ] The regenerated frontend client contains no `price` / `MoneyDto`, the
      `api-drift` check is green, and no beer view renders a price — verified
      in a browser on the beer list and a beer details page
- [ ] `formatPrice` and its en/fi strings are removed, and
      [ADR-0011](../../adr/0011-i18next-localization.md) no longer points at a
      helper that does not exist
- [ ] An automated test asserting a beer carries no price is added to the
      catalog suite (`mvn test` / `npm test`), and every existing test that
      built a `Money` or asserted on a price is updated; the suite was
      confirmed to fail against the pre-removal code
- [ ] `docs/architecture.md` §1 and §3, `README.md`, `docs/glossary.md` and
      any price-mentioning ADR are updated — no doc still lists price as a
      searchable attribute or a beer property (quality backlog MUST-7);
      `make verify` is green

## Notes

Provenance: product-owner review comment on
[PR #221](https://github.com/MiguelSombrero/kalia/pull/221) (the iteration-6
task 08 glossary PR), against the `Money` glossary row. The comment asked for
this task to be filed rather than the change made in that PR.
