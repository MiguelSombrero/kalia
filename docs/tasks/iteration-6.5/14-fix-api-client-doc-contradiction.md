# Task 14: Resolve architecture.md's contradiction about the API client

- **Status:** refined
- **Iteration:** [6.5](../iteration-6.5.md)
- **Covers:** none

## Why

`docs/architecture.md` contradicts itself about the frontend's API client.

- §4 conventions: "The frontend may later generate its TypeScript client from
  the spec" — future tense, presented as optional
  ([architecture.md:266](../../architecture.md)).
- §5: "**API client generated from the backend's OpenAPI spec** … into
  `lib/api/generated/` (committed; CI regenerates and diffs to catch drift)"
  ([architecture.md:313](../../architecture.md)), and
  [ADR-0012](../../adr/0012-orval-api-client.md) has been accepted since
  2026-07-22.

A reader who lands in §4 concludes the client is hand-written and may edit
files under `lib/api/generated/` that the next `npm run generate:api`
discards without a word — the exact failure that
`.claude/settings.json`'s `Edit` deny and CI's `api-client-drift` job exist to
prevent, reached here through stale prose instead.

## Scope

§4's API-client sentence states current reality — the client is generated,
committed and drift-checked — or defers to §5 with a pointer. No reader of the
doc set concludes the client is hand-written or that generating it is optional.

## Non-goals

- Re-deciding anything in [ADR-0012](../../adr/0012-orval-api-client.md).
- The Radix / tech-stack documentation drift (quality backlog MUST-4,
  SHOULD-20) — separate findings.
- The price-as-search-filter documentation bug (quality backlog MUST-7) —
  folded into [task 10](10-remove-beer-price.md).

## Constraints

- [ADR-0020](../../adr/0020-documentation-roles.md)'s one-home rule: §5 and
  [`frontend/README.md`](../../../frontend/README.md) already own the "shape"
  and "how" of the generated client, so §4's mention becomes a one-line
  pointer, not a second description.
- `ArchitectureDocumentationTest` parses §2 and §3 only — it will not catch a
  regression in §4, so the fix's durability rests on the wording being a
  pointer rather than on a test.
- The sentence sits under §4's springdoc / OpenAPI bullet, so the natural
  shape is "…and the frontend generates its client from it — see §5".

## Open questions

**None.**

Resolved during refinement (2026-09-05):

- **Completeness:** confirmed by running the grep now —
  `grep -rn "may later generate\|hand-written client" docs/ README.md` finds
  exactly one stale spot outside this task file itself:
  `docs/architecture.md:267`. Nothing else in `docs/` needs the sweep.
- **Interaction:** decided — §4 keeps a one-line pointer ("…and the frontend
  generates its client from it — see §5"), rather than dropping the mention
  entirely; matches this task's own Constraints on the natural shape of the
  sentence.
- **Completion signal:** confirmed — "no sentence in the doc set implies the
  client is hand-written or optional, confirmed by grep" is the bar.

## Acceptance criteria

- [ ] `docs/architecture.md` §4 no longer implies the generated client is
      future or optional — it states the current fact or points to §5
- [ ] A repo-wide grep (run in refinement and recorded in the PR) finds no
      remaining "may later generate" / "hand-written client" phrasing across
      `docs/`
- [ ] The backend test that parses this document —
      `ArchitectureDocumentationTest` — still passes against the edited §2/§3,
      and `make verify` is green (`check-adrs`, `check-tasks`,
      `check-comments`, `npm test`, `mvn verify`)

## Notes

Provenance: quality backlog **MUST-5** (confirmed 2026-08-30). Not
`[needs decision]` — ready as written.
