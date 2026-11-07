# Task 18: A client falls back on an enum value it does not know

- **Status:** refined
- **Iteration:** [11](../iteration-11.md)
- **Covers:** none

## Why

`docs/architecture.md` §4 states as fact that a client falls back on an enum
value it does not know
([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md)),
and nothing keeps the promise. Orval emits closed unions; the web's
`bottleFacts.ts` maps `ContainerType` exhaustively, so `BottleTile` renders
`t(undefined)` for a new value, and `editBottleSchema.ts`'s `z.enum` refuses to
save such a bottle. The mobile app reads no enum yet; this iteration's catalog is
where it begins to (a style group's colour, a beer's status), and iteration 12's
cellar and the admin outcome codes are where it becomes real. ADR-0093's Bad
consequence admits neither client was audited.

It matters most for an installed app, which keeps running against a backend that
only grows.

A second, related gap: `SuggestionDecisionDto.outcome` is typed `ReviewOutcome`,
so the spec and generated client allow `REMOVED` on the `200` of an approval or
rejection, a value only the `409` can carry. Giving the `200` its own two-value
enum is additive-breaking for a client that switches on it, so it is done before
an app build depends on it.

## Scope

The promise holds, or is narrowed to where it can: a value a client has not seen
is shown with a fallback instead of crashing, rendering nothing, or refusing a
save; and the `200` of a review decision is typed to what it can carry.

## Non-goals

- Making every response field open; only enums a client maps to a label, a
  colour or a form.
- The admin pages (iteration 10.5).

## Constraints

- The committed spec fails a breaking diff
  ([ADR-0093](../../adr/0093-the-api-is-additive-only-while-an-app-is-installed-and-a-committed-spec-fails-a-breaking-diff.md));
  the `200` change is reviewed against it and its waiver rule.
- The generated client is read-only
  ([ADR-0012](../../adr/0012-orval-api-client.md)); the fix is in the Orval
  configuration or above the client.
- The web deploys with the backend, so its unknown value is a transient
  inconsistency; the app's is permanent until updated.

**Decided at refinement, 2026-11-07** (product owner):

- **A label-with-fallback helper in `@kalia/api` serves both clients,** and a
  lint rule fails an enum lookup that bypasses it. The rule is not narrowed to
  mobile, so §4 stands as a promise both clients keep.
- **An unknown value reads as a generic word,** "Other" in `en` and "Muu" in
  `fi`; a form keeps the value it was given and saves it unchanged.
- **The app's style-group colour mapping uses the helper,** and this task lands
  before [task 03](03-design-kalias-identity-on-a-phone.md), whose rows need
  the fallback.

## Open questions

**None.**

## Acceptance criteria

- [ ] A component test renders the web's `BottleTile` with a container type the
      client does not list and shows a fallback label; it failed before
- [ ] A test shows `editBottleSchema` keeping an unknown container type on save
- [ ] A lint fixture with an enum lookup that bypasses the helper fails the
      rule
- [ ] A test shows the app's style-group mapping, or the helper it uses, giving
      an unknown value a fallback
- [ ] The `200` of a review decision is typed with its own enum, the committed
      spec and generated client are regenerated, and `make openapi-spec` shows
      no breaking diff beyond the documented waiver
- [ ] §4 of `docs/architecture.md` and ADR-0093 state what holds
- [ ] `make verify-fast` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-108 (`[needs
decision]`) and COULD-132. Runs before the catalog screens, which are the first
mobile code to map an enum.
