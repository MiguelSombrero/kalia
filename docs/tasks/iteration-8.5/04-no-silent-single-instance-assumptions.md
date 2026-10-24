# Task 04: The backend assumes one instance only where it says so

- **Status:** refined
- **Iteration:** [8.5](../iteration-8.5.md)

## Why

`docs/architecture.md:52` says the design must not prevent horizontal
scaling. The feed cursor's signing key is generated per process, in memory
(`backend/src/main/java/fi/kalia/feed/application/FeedCursorCodec.java:16-19,31-35`),
with no ADR or §8 entry recording the choice. Every restart invalidates every
cursor. With two instances, a `since` poll that lands on the other one gets a
400, which `frontend/features/feed/actions.ts:37-52` turns into `startOver` and
`FeedList.tsx:79-83` into `window.location.reload()` — every 15 seconds. A
mobile offline cache would hold cursors that died with the process that
signed them.

The documents say the opposite. [ADR-0060](../../adr/0060-feed-delivery-is-polling.md)
says a second backend instance "needs nothing extra" (`:77-79`) and lists it as
a Good consequence (`:162-164`).
[ADR-0081](../../adr/0081-incomplete-event-publications-are-resubmitted-five-times-and-completed-ones-deleted.md)
separately accepts a single-instance assumption for event resubmission
(`:128-130`, `EventPublicationResubmission.java:47-51`). Neither appears in
§8's "Trade-offs made explicit".

## Scope

A cursor signed by one instance is accepted by every other and survives a
restart. ADR-0060 says what is true. §8 names each single-instance assumption
that remains, with its revisit trigger.

## Non-goals

- Running two instances anywhere — there is no deployment.
- Changing ADR-0081's resubmission design; this task makes its assumption
  visible, not different.

## Constraints

- [ADR-0015](../../adr/0015-configuration-strategy.md): an environment-varying
  value is a `${ENV_VAR:default}` placeholder whose default fails safest, and a
  setting that must not have a default is listed in
  `RequiredConfigurationValidator.REQUIRED`.
- The cursor stays tamper-evident and rejected uniformly
  (`FeedCursorCodec.java:45-66`, constant-time compare).

**Decided at refinement, 2026-10-24** (product owner):

- **A configured, shared signing key** (`FEED_CURSOR_KEY` or similar), required with no default except in the compose dev stack, like the other secrets. The cursor's format and its uniform rejection stay as they are. A key stored in the database and an unsigned cursor were rejected.
- **Recorded as an amendment to [ADR-0060](../../adr/0060-feed-delivery-is-polling.md)**, which also corrects its "needs nothing extra" claim; §8 gains the single-instance entry.

## Open questions

**None.**

## Acceptance criteria

- [ ] A cursor issued before a backend restart is accepted after it — an
      integration test restarts the context, or builds two codecs from the same
      configuration, and confirms today's code rejects it
- [ ] A tampered cursor is still rejected with the same 400 — the existing
      test still passes
- [ ] ADR-0060 no longer claims a second instance needs nothing extra unless
      it is true, and §8 lists every remaining single-instance assumption
- [ ] `make verify` is green

## Notes

Provenance: [quality backlog](../quality-backlog.md) SHOULD-47, widened on
2026-10-24 with the ADR-0060 and ADR-0081 drift.
