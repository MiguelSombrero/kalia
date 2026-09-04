# Task 12: The dev CSP blocks React's development-mode `eval()`

- **Status:** refined
- **Iteration:** [6](../iteration-6.md)

## Why

Running `next dev` (Turbopack) and opening any page logs a Content Security
Policy violation in the browser console:

> The Content Security Policy (CSP) stops the evaluation of arbitrary strings
> as JavaScript … `script-src` … blocked

The blocked code is one of Next's hashed dev chunks (observed as
`2b9a71mhgdrp6.js:1`). It is React's server-components dev client calling
`(0, eval)(…)` from `createFakeFunction`
(`frontend/node_modules/next/dist/compiled/react-server-dom-turbopack/cjs/react-server-dom-turbopack-client.browser.development.js`,
around line 3410), used to reconstruct server-side call stacks and other
debug information in the browser. React emits its own console error alongside
the browser's:

> eval() is not supported in this environment. If this page was served with a
> `Content-Security-Policy` header, make sure that `unsafe-eval` is included.
> React requires eval() in development mode for various debugging features
> like reconstructing callstacks from a different environment. React will
> never use eval() in production mode

Root cause: `frontend/next.config.ts` serves **one static CSP for every
environment** — `script-src 'self' 'unsafe-inline'`, no `'unsafe-eval'` —
and `next dev` needs `'unsafe-eval'`. Next.js documents this exact case
(`frontend/node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md`,
line 42): "In development, `'unsafe-eval'` is required … `unsafe-eval` is not
required for production. Neither React nor Next.js use `eval` in production by
default." Every CSP example in that guide branches its `script-src` on an
`isDev` flag; ours does not.

Why it is worth doing now: the violation is live on every dev page load. It
degrades the React/Next error overlay (server stack reconstruction fails
silently), and a console that always shows a CSP violation trains developers
to stop reading CSP violations — which is the one signal that catches a
genuine external-origin or inline-script regression against this app's
`'unsafe-inline'` trade-off ([ADR-0016](../../adr/0016-security-response-headers.md)).
Production is unaffected: the `curl -I` evidence in ADR-0016 was taken
against a production build, where React does not use `eval`.

## Scope

- `next dev` serves a CSP whose `script-src` permits React's development
  `eval()`, so a fresh dev page load produces zero CSP violations in the
  browser console.
- `next build` / `next start` and the Docker production image serve a CSP
  **unchanged** from today — no `'unsafe-eval'`, every other directive
  identical.
- The behaviour is covered by an automated test that fails against the
  current single-environment header.

## Non-goals

- Revisiting `'unsafe-inline'` or the no-nonce decision — that trade-off was
  re-affirmed on 2026-08-23 ([ADR-0016](../../adr/0016-security-response-headers.md))
  and nothing here reopens it.
- The other response headers (`X-Frame-Options`, `Referrer-Policy`, HSTS,
  `Permissions-Policy`) — untouched.
- The backend's own direct responses — out of scope for ADR-0016 and for
  this task.

## Constraints

- **`headers()` in `next.config.ts` is baked in at build time**, and a
  `process.env` value there is frozen to whatever was set during that build
  ([ADR-0016](../../adr/0016-security-response-headers.md) 2026-07-30
  amendment / [ADR-0025](../../adr/0025-authjs-valkey-adapter.md) Evidence).
  This does not block the fix — `next dev` and `next build` are separate
  processes with different `NODE_ENV` — but the fix must key off the
  build-time environment, not attempt a runtime toggle, and must not be
  driveable by a deployment env var.
- ADR-0016 is the home of the CSP decision and its hand-run source survey;
  its 2026-08-23 amendment explicitly records "no `eval` anywhere in
  `frontend/`" (our code) as the basis for keeping `'unsafe-inline'`. That
  statement stays true — the `eval` here is React's, in development only —
  but the ADR must be amended in the implementing PR to record that the dev
  CSP now diverges and why (doc-sync gate).
- `next.config.ts`'s `async headers()` is written as `headers: async () => …`
  to satisfy the arrow-function-only ESLint rule
  ([ADR-0016](../../adr/0016-security-response-headers.md) Consequences) — any
  refactor of the header construction keeps that form.
- Verify in a real browser console, not with `curl` — `curl` does not enforce
  CSP ([ADR-0016](../../adr/0016-security-response-headers.md) Evidence,
  `frontend/AGENTS.md` traps).
- **Environment detection: `process.env.NODE_ENV === "development"`**
  (refined 2026-09-04) — matches Next's own CSP doc examples; the header is
  still built at `next build`/`next dev` process start, so this reads
  correctly without becoming a runtime toggle (see the constraint above).
- **Whether `'unsafe-eval'` needs to reach `worker-src`/`child-src` or any
  other directive besides `script-src` is not a refinement decision** — it
  is settled during implementation by observing the dev console with the fix
  in place, and the "zero CSP violations" acceptance criterion below is what
  proves it either way.
- **Header-building logic is extracted out of `next.config.ts` into a
  testable function** (refined 2026-09-04), specifically so both build
  modes' `script-src` can be unit-tested directly rather than only through a
  coarser e2e/`curl` check. `headers()` in `next.config.ts` calls the
  extracted function; the arrow-function-only ESLint rule above still binds
  wherever it's called from `next.config.ts` itself.
- **Terminology**: no new name is introduced for the dev/prod split — the
  ADR-0016 amendment describes the divergence inline, matching how the ADR
  already describes the rest of the header.

## Open questions

**None.**

## Acceptance criteria

- [ ] With `next dev` running, loading `/en`, `/en/beers` and a beer detail
      page produces **zero** CSP violations in the browser console —
      verified in a browser, and confirmed to fail (violation present) before
      the fix
- [ ] `curl -I` against a production build (`next start` or the Docker image)
      shows a `Content-Security-Policy` header byte-identical to today's —
      no `'unsafe-eval'`
- [ ] A unit test against the header-building function extracted from
      `next.config.ts` asserts `script-src` contains `'unsafe-eval'` when
      built for development and does not when built for production, and was
      confirmed to fail against the current single-environment `cspHeader`
- [ ] `make verify` passes
- [ ] [ADR-0016](../../adr/0016-security-response-headers.md) is amended (not
      rewritten) to record the dev/prod CSP divergence and its reason, and
      `docs/architecture.md`'s security-headers reference is re-checked

## Notes

Found 2026-09-03 while testing the application in `next dev`. Not caused by
any iteration-6 change — `next.config.ts`'s CSP has been environment-blind
since it was introduced in iteration 3
([ADR-0016](../../adr/0016-security-response-headers.md)); Turbopack dev and
the React 19 server-components client make the `eval` path reachable on an
ordinary page load rather than only inside the error overlay.

Rides along in iteration 6 for the same reason as
[task 09](09-batch-beer-lookup-for-cellar.md) and
[task 10](10-cellar-relative-date-precision.md): a real defect, not urgent
enough to hold a release, not so minor it should sit in the general backlog.
Does not serve this iteration's "Done when".

Not in the [quality backlog](../quality-backlog.md).
