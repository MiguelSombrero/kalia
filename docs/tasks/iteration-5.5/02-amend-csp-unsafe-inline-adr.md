# Task 02: Re-affirm CSP `unsafe-inline` and close ADR-0016's revisit trigger

- **Status:** done
- **Iteration:** [5.5](../iteration-5.5.md)

## Why

[ADR-0016](../../adr/0016-security-response-headers.md) accepted
`script-src 'unsafe-inline'` (`frontend/next.config.ts`) with an explicit
condition for revisiting it: "once Auth/Cellar land and there's real
session/user data to protect, the `'unsafe-inline'` trade-off should be
re-examined against nonce-based CSP." Iteration 4 shipped authentication and
iteration 5 shipped the cellar — the trigger has fired and nothing has
revisited it.

The 2026-08-23 quality-backlog triage re-ran the ADR's original source
survey by hand: no `dangerouslySetInnerHTML`, no `innerHTML`, no `eval`, no
inline `<script>` anywhere in `frontend/`. The margin the ADR accepted still
holds; the *decision* about it is what's overdue, and the product owner has
made the call: re-affirm `'unsafe-inline'` rather than take on a nonce-based
CSP's cost (which would mean giving up static rendering of the locale-root
page) or Subresource Integrity.

## Scope

- Amend ADR-0016 (never rewrite — [ADR-0019](../../adr/0019-adr-format-and-conventions.md))
  recording that the revisit trigger fired, the source survey was re-run, and
  the decision is to keep `'unsafe-inline'`.
- Close the gap that made this survey manual every sweep: add an automated
  guard so a future `dangerouslySetInnerHTML` or similar doesn't ship
  unnoticed between quality sweeps.

## Non-goals

- Adopting nonce-based CSP or SRI — decided against for now; either remains
  available to a future ADR amendment if the risk profile changes.
- Any other CSP directive — `style-src`, `form-action`, etc. are unaffected.

## Constraints

- [ADR-0016](../../adr/0016-security-response-headers.md) is accepted;
  amend it, don't replace it.
- [ADR-0019](../../adr/0019-adr-format-and-conventions.md)'s amendment
  format.

## Open questions

**None.**

## Acceptance criteria

- [x] ADR-0016 has a 2026-08-23-or-later Amended note stating the trigger
      fired, the survey was re-run, and `'unsafe-inline'` is re-affirmed
- [x] ESLint forbids `dangerouslySetInnerHTML` (`react/no-danger` or
      equivalent) across `frontend/` — confirmed by a test: introduce one
      deliberately and confirm lint fails, then remove it
- [x] `node scripts/check-adrs.mjs` passes

## Notes

Quality backlog: SHOULD-9. `[needs decision]` resolved by the product owner
during the 2026-08-23 quality-backlog triage: re-affirm `'unsafe-inline'`
and amend the ADR, rather than adopt nonce-based CSP or SRI.
