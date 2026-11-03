# Task 15: Decide what deleting an account does to what Kalia keeps forever

- **Status:** needs-refinement
- **Iteration:** [10.5](../iteration-10.5.md)
- **Covers:** none

## Why

Three accepted decisions keep a user's identifier forever by design: a username
is never reused ([ADR-0080](../../adr/0080-a-username-is-unique-regardless-of-case-and-never-reused.md)),
a contributed beer keeps its `contributor_id`
([ADR-0091](../../adr/0091-a-contributed-catalog-entry-waits-for-an-operator-and-no-catalog-row-is-ever-deleted.md)),
and a feed line keeps its `user_id`
([ADR-0058](../../adr/0058-feed-event-recording-model.md)). Meanwhile
[the backlog](../backlog.md) lists GDPR account deletion as needed before any
store release. Each decision was sound alone; together they stack up work for
the day deletion lands (COULD-83).

This iteration adds two more: a review record naming who suggested and who
decided ([task 02](02-decision-what-reviewing-a-suggestion-does.md)), and a
notification per user ([task 03](03-decision-how-a-contributor-is-notified.md)).
Deciding the strategy now lets those be shaped for it rather than reworked.

## Scope

An ADR records what deleting an account does to each kind of row that names a
user — removed, pseudonymised under a tombstone, or kept — and the identifier
that survives it, without implementing deletion.

## Non-goals

- Implementing account deletion, data export or a consent flow, which stay in
  [the backlog](../backlog.md).

## Constraints

- Identity is the Keycloak `sub`, and `profile` owns the username
  ([ADR-0028](../../adr/0028-resource-server-and-current-user.md),
  [ADR-0049](../../adr/0049-profile-module-and-public-identity.md)); Keycloak
  holds the account's personal data, Kalia only what it copied.
- No catalog row is ever deleted (ADR-0091), and what deletion does to a beer
  a user added is already decided in
  [iteration 8 task 02](../iteration-8/02-add-beer-api.md).
- Accepted ADRs are amended, not rewritten
  ([ADR-0019](../../adr/0019-adr-format-and-conventions.md)).

## Open questions

1. **COULD-83 (`[needs decision]`):** record a tombstone or pseudonymisation
   strategy now, or accept the rework when deletion lands and say so in the
   affected ADRs.
2. **A deleted user's feed lines and public cellar:** gone, or kept under a
   placeholder name.
3. **A deleted user's username:** still never reused (ADR-0080), or released.
4. **This iteration's review records and notifications:** deleted with the
   account, or kept pseudonymised for the catalog's history.

## Acceptance criteria

- [ ] An ADR records, for every table that names a user, what deletion does to
      it and the identifier that survives, and passes
      `node scripts/check-adrs.mjs`
- [ ] ADR-0058, ADR-0080 and ADR-0091 are amended where the answer changes
      what they state
- [ ] Each test the decision implies is named in the acceptance criteria of
      [task 09](09-a-contributor-is-told-what-became-of-their-suggestion.md),
      or in a backlog entry for the deletion work, before task 09 is refined

## Notes

Provenance: [quality backlog](../quality-backlog.md) COULD-83, `[needs
decision]` (open question 1). A decision task, so it adds no automated test of
its own — see [iteration 8 task 01](../iteration-8/01-catalog-data-source.md).
